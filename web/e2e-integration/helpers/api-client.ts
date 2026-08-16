export interface AuthInfo {
  cookie: string;
  token: string;
  uid: number;
}

export class ApiClient {
  constructor(
    private baseUrl: string,
    private auth?: AuthInfo
  ) {}

  setAuth(auth: AuthInfo) {
    this.auth = auth;
  }

  getToken(): string {
    return this.auth?.token || "";
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (this.auth) {
      h["Cookie"] = this.auth.cookie;
      h["New-Api-User"] = String(this.auth.uid);
      h["Authorization"] = `Bearer ${this.auth.token}`;
    }
    return h;
  }

  async setupRootUser(username: string, password: string): Promise<{ success: boolean }> {
    const resp = await fetch(`${this.baseUrl}/api/setup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        password,
        confirmPassword: password,
        SelfUseModeEnabled: false,
        DemoSiteEnabled: false,
      }),
    });
    return resp.json();
  }

  lastLoginBundle: any = null;

  async login(username: string, password: string): Promise<AuthInfo> {
    const resp = await fetch(`${this.baseUrl}/api/user/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const cookie = resp.headers.get("set-cookie") || "";
    const body = await resp.json();
    if (!body.success) {
      throw new Error(`Login failed: ${body.message}`);
    }
    this.lastLoginBundle = body.data;
    const auth: AuthInfo = {
      cookie,
      token: body.data?.access_token || body.data?.token || "",
      uid: body.data?.user?.id || body.data?.id || 0,
    };
    this.auth = auth;
    return auth;
  }

  async getSetupStatus(): Promise<any> {
    const resp = await fetch(`${this.baseUrl}/api/setup`);
    return resp.json();
  }

  async createChannel(data: {
    name: string;
    type: number;
    key: string;
    base_url?: string;
    models?: string;
    model_mapping?: string;
    group?: string;
  }): Promise<any> {
    const resp = await fetch(`${this.baseUrl}/api/channel/`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        mode: "single",
        channel: {
          name: data.name,
          type: data.type,
          key: data.key,
          base_url: data.base_url || "",
          models: data.models || "gpt-3.5-turbo",
          model_mapping: data.model_mapping || "",
          group: data.group || "default",
          groups: ["default"],
          priority: 0,
          weight: 1,
          status: 1,
        },
      }),
    });
    return resp.json();
  }

  async createToken(data: {
    name: string;
    remain_quota?: number;
    unlimited_quota?: boolean;
  }): Promise<any> {
    const resp = await fetch(`${this.baseUrl}/api/token/`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        name: data.name,
        remain_quota: data.remain_quota ?? 500000,
        unlimited_quota: data.unlimited_quota ?? false,
        expired_time: -1,
        models: [],
        subnet: "",
      }),
    });
    return resp.json();
  }

  async createUser(data: {
    username: string;
    password: string;
    display_name?: string;
  }): Promise<any> {
    const resp = await fetch(`${this.baseUrl}/api/user/`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        username: data.username,
        password: data.password,
        display_name: data.display_name || data.username,
      }),
    });
    return resp.json();
  }

  async getChannels(): Promise<any> {
    const resp = await fetch(`${this.baseUrl}/api/channel/?p=0&page_size=20`, {
      headers: this.headers(),
    });
    const body = await resp.json();
    // Normalize: data.items or data (for backward compat)
    if (body.data?.items) body.data = body.data.items;
    return body;
  }

  async deleteChannel(id: number): Promise<any> {
    const resp = await fetch(`${this.baseUrl}/api/channel/${id}/`, {
      method: "DELETE",
      headers: this.headers(),
    });
    return resp.json();
  }

  async getTokens(): Promise<any> {
    const resp = await fetch(`${this.baseUrl}/api/token/?p=0&page_size=20`, {
      headers: this.headers(),
    });
    const body = await resp.json();
    if (body.data?.items) body.data = body.data.items;
    return body;
  }

  async getUsers(): Promise<any> {
    const resp = await fetch(`${this.baseUrl}/api/user/?p=0&page_size=20`, {
      headers: this.headers(),
    });
    const body = await resp.json();
    if (body.data?.items) body.data = body.data.items;
    return body;
  }

  async updateOption(key: string, value: string): Promise<any> {
    const resp = await fetch(`${this.baseUrl}/api/option/`, {
      method: "PUT",
      headers: this.headers(),
      body: JSON.stringify({ key, value }),
    });
    return resp.json();
  }

  async manageUser(data: { id: number; action: string; value?: number; mode?: string }): Promise<any> {
    const resp = await fetch(`${this.baseUrl}/api/user/manage`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        id: data.id,
        action: data.action,
        value: data.value || 0,
        mode: data.mode || "add",
      }),
    });
    return resp.json();
  }

  async deleteUser(id: number): Promise<any> {
    const resp = await fetch(`${this.baseUrl}/api/user/${id}`, {
      method: "DELETE",
      headers: this.headers(),
    });
    return resp.json();
  }

  async deleteToken(id: number): Promise<any> {
    const resp = await fetch(`${this.baseUrl}/api/token/${id}`, {
      method: "DELETE",
      headers: this.headers(),
    });
    return resp.json();
  }

  async createRedemption(data: { name: string; quota: number; count?: number }): Promise<any> {
    const resp = await fetch(`${this.baseUrl}/api/redemption/`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        name: data.name,
        quota: data.quota,
        count: data.count || 1,
      }),
    });
    return resp.json();
  }

  async getRedemptions(): Promise<any> {
    const resp = await fetch(`${this.baseUrl}/api/redemption/?p=0&page_size=20`, {
      headers: this.headers(),
    });
    const body = await resp.json();
    if (body.data?.items) body.data = body.data.items;
    return body;
  }

  async deleteRedemption(id: number): Promise<any> {
    const resp = await fetch(`${this.baseUrl}/api/redemption/${id}`, {
      method: "DELETE",
      headers: this.headers(),
    });
    return resp.json();
  }

  async createSubscriptionPlan(data: { title: string; price: number; quota: number; period_days?: number }): Promise<any> {
    const resp = await fetch(`${this.baseUrl}/api/subscription/admin/plans`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        plan: {
          title: data.title,
          price: data.price,
          quota: data.quota,
          period_days: data.period_days || 30,
          status: 1,
        },
      }),
    });
    return resp.json();
  }

  async getSubscriptionPlans(): Promise<any> {
    const resp = await fetch(`${this.baseUrl}/api/subscription/admin/plans`, {
      headers: this.headers(),
    });
    return resp.json();
  }

  async updateSubscriptionPlanStatus(id: number, status: number): Promise<any> {
    const resp = await fetch(`${this.baseUrl}/api/subscription/admin/plans/${id}`, {
      method: "PATCH",
      headers: this.headers(),
      body: JSON.stringify({ status }),
    });
    return resp.json();
  }

  async createModelMeta(data: { model_name: string; vendor?: string }): Promise<any> {
    const resp = await fetch(`${this.baseUrl}/api/models/`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model_name: data.model_name,
        vendor: data.vendor || "openai",
      }),
    });
    return resp.json();
  }

  async getModelsMeta(): Promise<any> {
    const resp = await fetch(`${this.baseUrl}/api/models/?p=0&page_size=20`, {
      headers: this.headers(),
    });
    const body = await resp.json();
    if (body.data?.items) body.data = body.data.items;
    return body;
  }

  async deleteModelMeta(id: number): Promise<any> {
    const resp = await fetch(`${this.baseUrl}/api/models/${id}`, {
      method: "DELETE",
      headers: this.headers(),
    });
    return resp.json();
  }

  async topUp(code: string): Promise<any> {
    const resp = await fetch(`${this.baseUrl}/api/user/topup`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ key: code }),
    });
    return resp.json();
  }

  async getSelf(): Promise<any> {
    const resp = await fetch(`${this.baseUrl}/api/user/self`, {
      headers: this.headers(),
    });
    return resp.json();
  }

  async getLogs(): Promise<any> {
    const resp = await fetch(`${this.baseUrl}/api/log/?p=0&page_size=20`, {
      headers: this.headers(),
    });
    const body = await resp.json();
    if (body.data?.items) body.data = body.data.items;
    return body;
  }

  async getLogsStat(): Promise<any> {
    const resp = await fetch(`${this.baseUrl}/api/log/stat`, {
      headers: this.headers(),
    });
    return resp.json();
  }

  async logout(): Promise<any> {
    const resp = await fetch(`${this.baseUrl}/api/user/auth/logout`, {
      method: "POST",
      headers: this.headers(),
    });
    return resp.json();
  }

  async confirmPaymentCompliance(): Promise<any> {
    const resp = await fetch(`${this.baseUrl}/api/option/payment_compliance`, {
      method: "POST",
      headers: this.headers(),
    });
    return resp.json();
  }
}
