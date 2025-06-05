const serverModule = context.asAbsolutePath(
  path.join("server", "out", "server.js"),
);

const serverOptions: ServerOptions = {
  run: { module: serverModule, transport: TransportKind.ipc },
  debug: { module: serverModule, transport: TransportKind.ipc },
};

const clientOptions: LanguageClientOptions = {
  documentSelector: [{ scheme: "file", language: "brahms" }],
};

const client = new LanguageClient(
  "brahmsLanguageServer",
  "Brahms Language Server",
  serverOptions,
  clientOptions,
);
client.start();
