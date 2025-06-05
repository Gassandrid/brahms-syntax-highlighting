/*
 * Tree‑sitter grammar for the **Brahms** language (superset of Java).
 * Focus: enough nodes for navigation (definitions, references, symbols).
 */

// helper for comma-separated lists
function commaSep(rule) {
  return seq(rule, repeat(seq(",", rule)));
}

const PREC = { section: 1 };

module.exports = grammar({
  name: "brahms",

  //  Lexer
  extras: ($) => [$.comment, /[\s\f\r\n\t]+/],

  word: ($) => $.identifier,

  rules: {
    // Program root
    program: ($) => repeat($._statement),

    // Statements (top‑level)
    _statement: ($) =>
      choice(
        $.package_statement,
        $.import_statement,
        $.jimport_statement,
        $.agent_declaration,
        $.group_declaration,
        ";", // stray semicolons
      ),

    // package ejenta.foo;
    package_statement: ($) => seq("package", $.qualified_name, ";"),

    // import foo.*;
    import_statement: ($) => seq("import", $.qualified_name, ";"),

    // jimport java.util.Map;
    jimport_statement: ($) => seq("jimport", $.qualified_name, ";"),

    // agent Foo memberof A, B {
    agent_declaration: ($) =>
      seq(
        "agent",
        field("name", $.identifier),
        optional(seq("memberof", commaSep($.identifier))),
        $.block,
      ),

    group_declaration: ($) =>
      seq("group", field("name", $.identifier), $.block),

    // geeneric type blocks { … }
    block: ($) =>
      seq(
        "{",
        repeat(
          choice(
            $.section,
            $.attribute_declaration,
            $.workframe_declaration,
            $.activity_declaration,
            $._statement,
          ),
        ),
        "}",
      ),

    // sectoin header like attributes, etc: { … }
    section: ($) =>
      prec.right(
        PREC.section,
        seq(
          field(
            "section_name",
            choice(
              "attributes",
              "initial_beliefs",
              "activities",
              "workframes",
              "variables",
            ),
          ),
          ":",
          repeat1(
            choice(
              $.attribute_declaration,
              $.initial_belief,
              $.activity_declaration,
              $.workframe_declaration,
              $.variable_declaration,
            ),
          ),
        ),
      ),

    // public string foo;
    attribute_declaration: ($) =>
      seq(
        optional($.modifier_list),
        field("type", $.type),
        field("name", $.identifier),
        ";",
      ),

    variable_declaration: ($) =>
      seq(
        optional($.modifier_list),
        field("type", $.type),
        field("name", $.identifier),
        ";",
      ),

    // (current.x = "bar");
    initial_belief: ($) => seq("(", $.expression, ")", ";"),

    // activities
    activity_declaration: ($) =>
      seq(
        "java",
        field("name", $.identifier),
        "(",
        optional($.parameter_list),
        ")",
        $.activity_block,
        optional($.comment),
      ),

    parameter_list: ($) => commaSep(seq($.type, $.identifier)),

    activity_block: ($) => seq("{", repeat($.activity_property), "}"),

    activity_property: ($) =>
      seq(
        field("prop_name", choice("max_duration", "class", "when")),
        ":",
        field("prop_value", $._activity_value),
        ";",
      ),

    _activity_value: ($) => choice($.number, $.string_literal, $.identifier),

    // workframes
    workframe_declaration: ($) =>
      seq("workframe", field("name", $.identifier), $.block),

    // expressions / Types
    expression: ($) =>
      choice(
        $.assignment_expr,
        $.binary_expr,
        $.call_expr,
        $.identifier,
        $.string_literal,
        $.number,
      ),

    assignment_expr: ($) => seq($.expression, "=", $.expression),

    binary_expr: ($) =>
      prec.left(
        seq(
          $.expression,
          choice("and", "or", "==", "!=", "<", ">", "<=", ">="),
          $.expression,
        ),
      ),

    call_expr: ($) =>
      seq($.identifier, "(", optional(commaSep($.expression)), ")"),

    type: ($) =>
      choice(
        // java(Map<String, Object>)
        seq("java", "(", $.qualified_name, ")"),
        "string",
        "map",
        "int",
        "float",
        "double",
        "boolean",
        "void",
        $.qualified_name,
      ),

    modifier_list: ($) =>
      repeat1(choice("public", "private", "protected", "static", "final")),

    qualified_name: ($) => sep1($.identifier, "."),

    // tokens
    identifier: ($) => /[A-Za-z_][A-Za-z0-9_]*/,

    number: ($) => /[0-9]+(\.[0-9]+)?/,

    string_literal: ($) => seq('"', repeat(choice(/[^"\\\n]+/, /\\./)), '"'),

    comment: ($) => token(choice(seq("//", /.*/), seq("/*", /[\s\S]*?/, "*/"))),
  },
});

// Helper: like commaSep but allowing at least one element
function sep1(rule, separator) {
  return seq(rule, repeat(seq(separator, rule)));
}
