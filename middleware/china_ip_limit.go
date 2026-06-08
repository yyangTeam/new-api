package middleware

import (
	"net"
	"net/http"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-gonic/gin"
)

const chinaIPLimitAPIEndpoint = "https://reverse-api.xyz/"

var chinaIPLimitCountryHeaders = []string{
	"CF-IPCountry",
	"CloudFront-Viewer-Country",
	"X-Vercel-IP-Country",
	"X-Appengine-Country",
	"X-Country-Code",
	"X-Geo-Country",
	"X-Client-Country",
}

var chinaIPLimitBypassPathPrefixes = []string{
	"/api",
	"/v1",
	"/v1beta",
	"/pg",
	"/mj",
	"/suno",
	"/kling",
	"/jimeng",
}

type chinaIPLimitCIDRMatcher struct {
	networks  []*net.IPNet
	singleIPs []net.IP
}

func ChinaIPLimit() gin.HandlerFunc {
	if !common.ChinaIPLimitEnabled {
		return defNext
	}

	cidrMatcher := newChinaIPLimitCIDRMatcher(common.ChinaIPLimitCIDRs)
	return func(c *gin.Context) {
		if chinaIPLimitShouldBypassPath(c.Request.URL.Path) {
			c.Next()
			return
		}

		if isChinaMainlandRequest(c, cidrMatcher) {
			renderChinaIPLimitPage(c)
			return
		}

		c.Next()
	}
}

func newChinaIPLimitCIDRMatcher(cidrs []string) chinaIPLimitCIDRMatcher {
	matcher := chinaIPLimitCIDRMatcher{}
	for _, cidr := range cidrs {
		cidr = strings.TrimSpace(cidr)
		if cidr == "" {
			continue
		}
		if ip := net.ParseIP(cidr); ip != nil {
			matcher.singleIPs = append(matcher.singleIPs, ip)
			continue
		}
		_, network, err := net.ParseCIDR(cidr)
		if err != nil || network == nil {
			common.SysError("invalid CHINA_IP_LIMIT_CIDRS entry ignored: " + cidr)
			continue
		}
		matcher.networks = append(matcher.networks, network)
	}
	return matcher
}

func isChinaMainlandRequest(c *gin.Context, cidrMatcher chinaIPLimitCIDRMatcher) bool {
	if common.ChinaIPLimitTrustGeoHeaders && countryHeadersIndicateChinaMainland(c) {
		return true
	}

	clientIP := net.ParseIP(c.ClientIP())
	if clientIP == nil {
		return false
	}
	return cidrMatcher.contains(clientIP)
}

func countryHeadersIndicateChinaMainland(c *gin.Context) bool {
	for _, header := range chinaIPLimitCountryHeaders {
		value := c.GetHeader(header)
		if value == "" {
			continue
		}
		for _, part := range strings.Split(value, ",") {
			if strings.EqualFold(strings.TrimSpace(part), "CN") {
				return true
			}
		}
	}
	return false
}

func (m chinaIPLimitCIDRMatcher) contains(ip net.IP) bool {
	for _, singleIP := range m.singleIPs {
		if ip.Equal(singleIP) {
			return true
		}
	}
	for _, network := range m.networks {
		if network.Contains(ip) {
			return true
		}
	}
	return false
}

func chinaIPLimitShouldBypassPath(path string) bool {
	for _, prefix := range chinaIPLimitBypassPathPrefixes {
		if path == prefix || strings.HasPrefix(path, prefix+"/") {
			return true
		}
	}
	return false
}

func renderChinaIPLimitPage(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	c.Data(http.StatusForbidden, "text/html; charset=utf-8", chinaIPLimitPage)
	c.Abort()
}

var chinaIPLimitPage = []byte(`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>403 Forbidden</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #090f1c;
      --panel: #111827;
      --panel-border: rgba(148, 163, 184, 0.22);
      --muted: #9aa8bd;
      --text: #f8fafc;
      --text-soft: #d7deea;
      --accent: #ff5a2a;
      --accent-strong: #ff3d1f;
      --endpoint-bg: #081225;
      --endpoint-text: #9fd0ff;
    }

    * {
      box-sizing: border-box;
    }

    body {
      min-height: 100vh;
      margin: 0;
      display: grid;
      place-items: center;
      padding: 24px;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at 12% 0%, rgba(29, 78, 216, 0.42), transparent 34%),
        radial-gradient(circle at 92% 2%, rgba(127, 29, 29, 0.28), transparent 32%),
        linear-gradient(180deg, #0d1424 0%, var(--bg) 58%, #07101e 100%);
      color: var(--text);
    }

    main {
      width: min(560px, 100%);
      min-height: 496px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: clamp(28px, 5vw, 58px) clamp(22px, 4vw, 30px);
      border: 1px solid var(--panel-border);
      border-radius: 28px;
      background: rgba(17, 24, 39, 0.84);
      box-shadow: 0 28px 80px rgba(0, 0, 0, 0.32);
      text-align: center;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 33px;
      padding: 0 14px;
      border: 1px solid rgba(248, 113, 113, 0.44);
      border-radius: 999px;
      background: rgba(127, 29, 29, 0.32);
      color: #ffd5d0;
      font-size: 12px;
      font-weight: 700;
      line-height: 1;
    }

    .icon {
      width: 72px;
      height: 72px;
      margin-top: 28px;
      display: grid;
      place-items: center;
      border-radius: 24px;
      background: linear-gradient(135deg, #ff6a34 0%, var(--accent-strong) 100%);
      box-shadow: 0 20px 44px rgba(255, 85, 39, 0.32);
      color: white;
      font-size: 40px;
      font-weight: 900;
      line-height: 1;
    }

    h1 {
      margin: 27px 0 16px;
      font-size: clamp(28px, 5vw, 34px);
      line-height: 1.12;
      font-weight: 900;
      letter-spacing: 0;
    }

    .message {
      max-width: 500px;
      margin: 0;
      color: var(--text-soft);
      font-size: 16px;
      line-height: 1.85;
    }

    .endpoint-card {
      width: 100%;
      margin-top: 26px;
      padding: 20px 16px 17px;
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 16px;
      background: rgba(30, 41, 59, 0.72);
    }

    .endpoint-title {
      margin: 0 0 11px;
      color: #d8e0ec;
      font-size: 14px;
      font-weight: 800;
      line-height: 1.4;
    }

    .endpoint {
      display: inline-flex;
      max-width: 100%;
      padding: 8px 10px;
      border-radius: 9px;
      background: var(--endpoint-bg);
      color: var(--endpoint-text);
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      font-size: 14px;
      line-height: 1.15;
      overflow-wrap: anywhere;
      text-decoration: none;
    }

    footer {
      margin-top: 31px;
      color: rgba(154, 168, 189, 0.72);
      font-size: 12px;
    }

    @media (max-width: 520px) {
      body {
        padding: 16px;
      }

      main {
        min-height: min(560px, calc(100vh - 32px));
        border-radius: 22px;
      }

      .icon {
        width: 66px;
        height: 66px;
        border-radius: 22px;
      }

      .message {
        font-size: 15px;
      }
    }
  </style>
</head>
<body>
  <main>
    <div class="badge">403 Forbidden</div>
    <div class="icon" aria-hidden="true">!</div>
    <h1>当前地区暂不支持访问</h1>
    <p class="message">中国大陆 IP 暂不能访问网页内容。如需使用服务，请通过开放 API 端点请求。</p>
    <section class="endpoint-card" aria-label="API endpoint">
      <p class="endpoint-title">OpenAI / Claude 兼容接口仍可访问</p>
      <a class="endpoint" href="https://reverse-api.xyz/">https://reverse-api.xyz/</a>
    </section>
    <footer>reverse-api.xyz · Security policy</footer>
  </main>
</body>
</html>`)
