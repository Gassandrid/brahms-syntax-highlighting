import XCTest
import SwiftTreeSitter
import TreeSitterBrahmsParser

final class TreeSitterBrahmsParserTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_brahms_parser())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Brahms Parser grammar")
    }
}
