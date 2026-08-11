import http from "node:http";

const PORT = process.env.PORT || 10000;

const CATASTRO =
  "https://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/COVCCallejero.svc";

function enviarJSON(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store"
  });

  res.end(JSON.stringify(data, null, 2));
}

async function consultarCatastro(url) {
  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    15000
  );

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json, text/plain, */*",
        "User-Agent": "InmoRecursos-Catastro/1.0"
      },
      signal: controller.signal
    });

    const text = await response.text();

    return {
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get("content-type"),
      text
    };

  } finally {
    clearTimeout(timeout);
  }
}

const server = http.createServer(
  async (req, res) => {

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      });

      return res.end();
    }

    const url = new URL(
      req.url,
      `http://${req.headers.host}`
    );

    /* =========================================
       PÁGINA PRINCIPAL
    ========================================= */

    if (
      req.method === "GET" &&
      url.pathname === "/"
    ) {
      return enviarJSON(res, 200, {
        ok: true,
        servicio: "InmoRecursos Catastro API",
        estado: "online",
        siguientePrueba: "/api/test"
      });
    }

    /* =========================================
       PRUEBA RENDER → CATASTRO
    ========================================= */

    if (
      req.method === "GET" &&
      url.pathname === "/api/test"
    ) {

      const destino =
        `${CATASTRO}/json/ConsultaProvincia`;

      try {
        const inicio = Date.now();

        const respuesta =
          await consultarCatastro(destino);

        const tiempo =
          Date.now() - inicio;

        let datos = null;

        try {
          datos = JSON.parse(respuesta.text);
        } catch {
          datos = null;
        }

        return enviarJSON(res, 200, {
          ok: respuesta.ok,

          conexionRender: true,

          conexionCatastro: respuesta.ok,

          httpCatastro: respuesta.status,

          tiempoMs: tiempo,

          contentType: respuesta.contentType,

          formato:
            datos ? "JSON" : "NO_JSON",

          mensaje:
            respuesta.ok
              ? "Render ha conseguido comunicarse con Catastro."
              : "Catastro ha respondido con un error HTTP.",

          datos,

          respuestaOriginal:
            datos
              ? undefined
              : respuesta.text.slice(0, 2000)
        });

      } catch (error) {

        return enviarJSON(res, 502, {
          ok: false,

          conexionRender: true,

          conexionCatastro: false,

          mensaje:
            "Render funciona, pero no ha conseguido conectar con Catastro.",

          error:
            error?.message || String(error),

          causa:
            error?.cause
              ? String(error.cause)
              : null
        });
      }
    }

    /* =========================================
       RUTA NO ENCONTRADA
    ========================================= */

    return enviarJSON(res, 404, {
      ok: false,
      error: "Ruta no encontrada"
    });
  }
);

server.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `InmoRecursos Catastro API activa en puerto ${PORT}`
    );
  }
);
