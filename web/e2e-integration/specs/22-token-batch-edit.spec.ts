import { test, expect } from "../fixtures";

test.describe("Token 批量编辑", () => {
  let tokenIds: number[] = [];

  test("01 - 批量创建测试 Token", async ({ apiClient }) => {
    await test.step("创建 5 个测试 Token", async () => {
      for (let i = 0; i < 5; i++) {
        const result = await apiClient.createToken({
          name: `BatchEdit Token ${i}`,
          remain_quota: 100000,
          unlimited_quota: false,
        });
        expect(result.success).toBe(true);
      }
    });

    await test.step("获取 Token ID 列表", async () => {
      const tokens = await apiClient.getTokens();
      tokenIds = tokens.data
        ?.filter((t: any) => t.name?.startsWith("BatchEdit Token"))
        .map((t: any) => t.id) || [];
      expect(tokenIds.length).toBe(5);
    });
  });

  test("02 - 批量修改 Token 额度", async ({ apiClient }) => {
    await test.step("通过 API 批量修改额度为 500000", async () => {
      const resp = await fetch(
        `http://localhost:${process.env.INTEGRATION_PORT || "14000"}/api/token/batch`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiClient.getToken()}`,
          },
          body: JSON.stringify({
            ids: tokenIds,
            remain_quota: 500000,
            unlimited_quota: false,
          }),
        }
      );
      const result = await resp.json();
      expect(result.success).toBe(true);
    });

    await test.step("验证所有 Token 额度已更新", async () => {
      const tokens = await apiClient.getTokens();
      const updated = tokens.data?.filter((t: any) => tokenIds.includes(t.id));
      for (const tok of updated || []) {
        expect(tok.remain_quota).toBe(500000);
      }
    });
  });

  test("03 - 批量设置为无限额度", async ({ apiClient }) => {
    await test.step("通过 API 批量设置无限额度", async () => {
      const resp = await fetch(
        `http://localhost:${process.env.INTEGRATION_PORT || "14000"}/api/token/batch`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiClient.getToken()}`,
          },
          body: JSON.stringify({
            ids: tokenIds,
            unlimited_quota: true,
          }),
        }
      );
      const result = await resp.json();
      expect(result.success).toBe(true);
    });

    await test.step("验证所有 Token 为无限额度", async () => {
      const tokens = await apiClient.getTokens();
      const updated = tokens.data?.filter((t: any) => tokenIds.includes(t.id));
      for (const tok of updated || []) {
        expect(tok.unlimited_quota).toBe(true);
      }
    });
  });

  test("04 - 清理批量编辑测试数据", async ({ apiClient }) => {
    await test.step("删除所有测试 Token", async () => {
      for (const id of tokenIds) {
        await apiClient.deleteToken(id);
      }
    });

    await test.step("验证已删除", async () => {
      const tokens = await apiClient.getTokens();
      const remaining = tokens.data?.filter((t: any) => t.name?.startsWith("BatchEdit Token"));
      expect(remaining?.length || 0).toBe(0);
    });
  });
});
