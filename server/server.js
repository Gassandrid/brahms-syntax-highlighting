/* --------------------------------------------------------------------------------------------
 * Basic Language Server for Brahms
 * ------------------------------------------------------------------------------------------ */
import {
  createConnection,
  TextDocuments,
  DiagnosticSeverity,
  ProposedFeatures,
  TextDocumentSyncKind,
} from "vscode-languageserver/node"

import { TextDocument } from "vscode-languageserver-textdocument"
import { RegExpExecArray } from "typescript"

// Create a connection for the server
const connection = createConnection(ProposedFeatures.all)

// Create a document manager
const documents = new TextDocuments(TextDocument)

connection.onInitialize((params) => {
  const result = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Tell the client that this server supports code completion
      completionProvider: {
        resolveProvider: true,
      },
    },
  }
  return result
})

// The content of a text document has changed
documents.onDidChangeContent((change) => {
  validateTextDocument(change.document)
})

async function validateTextDocument(textDocument) {
  // Simple validation - check for common Brahms keywords
  const text = textDocument.getText()
  const pattern = /\b(agent|group|attributes|initial_beliefs|activities|workframes)\b/g
  let m: RegExpExecArray | null;

  const diagnostics = []

  while ((m = pattern.exec(text))) {
    // Just a simple example - in a real language server you'd do actual validation
    const diagnostic = {
      severity: DiagnosticSeverity.Information,
      range: {
        start: textDocument.positionAt(m.index),
        end: textDocument.positionAt(m.index + m[0].length),
      },
      message: `${m[0]} is a Brahms keyword`,
      source: "brahms",
    }
    diagnostics.push(diagnostic)
  }

  // Send the computed diagnostics to VSCode
  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics })
}

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection)

// Listen on the connection
connection.listen()

