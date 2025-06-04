addEventListener('fetch', (event) => {
  event.passThroughOnException()
  event.respondWith(handleRequest(event))
})

const routes = {
  github: {
    url: 'https://github.com',
    replaces: {
      'github.com': '$host/github',
      'raw.githubusercontent.com': '$host/githubusercontent',
    },
  },
  githubusercontent: {
    url: 'https://raw.githubusercontent.com',
    replaces: {
      'github.com': '$host/github',
      'raw.githubusercontent.com': '$host/githubusercontent',
    },
  },
  stable: {
    url: 'https://charts.helm.sh/stable',
    replaces: {
      'charts.helm.sh': '$host',
    },
  },
  incubator: {
    url: 'https://charts.helm.sh/incubator',
    replaces: {
      'charts.helm.sh': '$host',
    },
  },
  grafana: {
    url: 'https://grafana.github.io/helm-charts',
    replaces: {
      'github.com': '$host/github',
      'raw.githubusercontent.com': '$host/githubusercontent',
    },
  },
  prometheus: {
    url: 'https://prometheus-community.github.io/helm-charts',
    replaces: {
      'prometheus-community.github.io/helm-charts': '$host/prometheus',
    },
  },
  argo: {
    url: 'https://argoproj.github.io/argo-helm/',
    replaces: {
      'github.com': '$host/github',
      'raw.githubusercontent.com': '$host/githubusercontent',
    },
  },
  cilium: {
    url: 'https://helm.cilium.io/',
    replaces: {},
  },
}

async function handleRequest(event) {
  try {
    const request = event.request
    const url = new URL(request.url)
    const pathname = url.pathname
    const p = pathname.split('/').filter((e) => e.length != 0)
    if (p.length > 0) {
      for (const [key, value] of Object.entries(routes)) {
        if (p[0] == key) {
          const mirrorUrl = new URL(value.url)
          p[0] = mirrorUrl.pathname
          mirrorUrl.pathname = p.join('/')
          console.log('request', mirrorUrl.toString())
          const resp = await fetch(mirrorUrl)
          if (
            value.replaces &&
            (pathname.endsWith('index.yml') || pathname.endsWith('index.yaml'))
          ) {
            let contentType = resp.headers.get('content-type')
            if(request.url.endsWith('index.yml') || request.url.endsWith('index.yaml')) {
              contentType = 'text/yaml'
            }
            switch (contentType) {
              case 'text/yaml':
                let respStr = await resp.text()
                for (let [o, n] of Object.entries(value.replaces)) {
                  n = n.replaceAll('$host', url.hostname)
                  respStr = respStr.replaceAll(o, n)
                  console.log(`replace ${o} to ${n} in ${mirrorUrl} response`)
                }
                return new Response(respStr, {
                  status: resp.status,
                  headers: resp.headers,
                })
              default:
                console.log(`ignore ${contentType} response`)
                return resp
            }
          }
          return resp
        }
      }
    }
    return new Response(
      JSON.stringify({ message: 'no routes matched' }, { status: 404 }),
    )
  } catch (e) {
    console.warn('[handleRequest]', e.toString())
    return new Response(
      JSON.stringify({
        message: e.toString(),
      }),
      { status: 500 },
    )
  }
}
