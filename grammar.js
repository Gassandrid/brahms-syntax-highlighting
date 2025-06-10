/*
 * Tree-sitter grammar for the **Brahms** language (superset of Java).
 * Focus: enough nodes for navigation (definitions, references, symbols).
 */

// helper for comma-separated lists
const commaSep = (rule) => seq(rule, repeat(seq(",", rule)));

// helper for comma-separated lists with at least one element
const commaSep1 = (rule) => seq(rule, repeat(seq(",", rule)));

const PREC = {
  assign: -1,
  logical: 1,
  comparison: 2,
  call: 3,
  member: 4,
};

module.exports = grammar({
  name: "brahms",

  // Lexer
  extras: ($) => [$.comment, /[\s\f\r\n\t\v]+/],

  word: ($) => $.identifier,

  supertypes: ($) => [$._statement, $._expression, $._declaration],

  conflicts: ($) => [
    [$.qualified_name, $.field_expression],
    [$._expression, $.type],
  ],

  rules: {
    // Program root
    source_file: ($) => repeat($._statement),

    // Statements (top-level)
    _statement: ($) =>
      choice(
        $.package_statement,
        $.import_statement,
        $.jimport_statement,
        $._declaration,
        ";", // stray semicolons
      ),

    _declaration: ($) =>
      choice(
        $.agent_declaration,
        $.group_declaration,
        $.attribute_declaration,
        $.workframe_declaration,
        $.activity_declaration,
      ),

    // package ejenta.foo;
    package_statement: ($) => seq("package", $.qualified_name, ";"),

    // import foo.*;
    import_statement: ($) =>
      seq(
        "import",
        field("name", $.qualified_name),
        optional(seq(".", "*")),
        ";",
      ),

    // jimport java.util.Map;
    jimport_statement: ($) => seq("jimport", $.qualified_name, ";"),

    // agent Foo memberof A, B { ... }
    agent_declaration: ($) =>
      seq(
        "agent",
        field("name", $.identifier),
        optional(seq("memberof", commaSep1($.identifier))),
        $.block,
      ),

    // group Foo { ... }
    group_declaration: ($) =>
      seq("group", field("name", $.identifier), $.block),

    // Generic block { ... }
    block: ($) =>
      seq(
        "{",
        repeat(
          choice(
            $.attributes_section,
            $.initial_beliefs_section,
            $.activities_section,
            $.workframes_section,
            $._statement,
          ),
        ),
        "}",
      ),

    // Specific section rules to resolve ambiguity
    attributes_section: ($) =>
      seq("attributes", ":", repeat($.attribute_declaration)),

    initial_beliefs_section: ($) =>
      seq("initial_beliefs", ":", repeat($.initial_belief)),

    activities_section: ($) =>
      seq("activities", ":", repeat($.activity_declaration)),

    workframes_section: ($) =>
      seq("workframes", ":", repeat($.workframe_declaration)),

    // public string foo;
    attribute_declaration: ($) =>
      seq(
        optional($.modifier_list),
        field("type", $.type),
        field("name", $.identifier),
        ";",
      ),

    // (current.x = "bar");
    initial_belief: ($) => seq("(", $._expression, ")", ";"),

    // --- Activities ---
    activity_declaration: ($) =>
      seq(
        "java", // keyword
        field("name", $.identifier),
        "(",
        optional($.parameter_list),
        ")",
        $.activity_block,
      ),

    parameter_list: ($) => commaSep1(seq($.type, $.identifier)),

    activity_block: ($) => seq("{", repeat($.activity_property), "}"),

    activity_property: ($) =>
      seq(
        field("prop_name", choice("max_duration", "class", "when")),
        ":",
        field("prop_value", $._activity_value),
        ";",
      ),

    _activity_value: ($) => choice($.number, $.string_literal, $.identifier),

    // --- Workframes ---
    workframe_declaration: ($) =>
      seq(
        "workframe",
        field("name", $.identifier),
        "{",
        repeat(
          choice(
            $.priority_property,
            $.workframe_variables_section,
            $.when_clause,
            $.do_block,
          ),
        ),
        "}",
      ),

    priority_property: ($) => seq("priority", ":", $.number, ";"),

    workframe_variables_section: ($) =>
      seq("variables", ":", repeat1($.quantified_variable_declaration)),

    quantified_variable_declaration: ($) =>
      seq(
        "forone",
        "(",
        field("type", $.type),
        ")",
        field("name", $.identifier),
        ";",
      ),

    when_clause: ($) => seq("when", "(", $._expression, ")"),

    do_block: ($) => seq("do", "{", repeat($._do_statement), "}"),

    _do_statement: ($) =>
      choice($.expression_statement, $.local_variable_declaration),

    expression_statement: ($) => seq($._expression, ";"),

    local_variable_declaration: ($) =>
      seq(
        $.type,
        field("name", $.identifier),
        optional(seq("=", field("value", $._expression))),
        ";",
      ),

    // --- Expressions & Types ---
    _expression: ($) =>
      choice(
        $.assignment_expression,
        $.binary_expression,
        $.call_expression,
        $.field_expression,
        $.new_expression,
        $.identifier,
        $.string_literal,
        $.number,
        $.parenthesized_expression,
      ),

    parenthesized_expression: ($) => seq("(", $._expression, ")"),

    assignment_expression: ($) =>
      prec.right(
        PREC.assign,
        seq(
          field(
            "left",
            choice($.field_expression, $.identifier, $.call_expression),
          ),
          "=",
          field("right", $._expression),
        ),
      ),

    binary_expression: ($) =>
      choice(
        prec.left(
          PREC.logical,
          seq($._expression, choice("and", "or"), $._expression),
        ),
        prec.left(
          PREC.comparison,
          seq(
            $._expression,
            choice("==", "!=", "<", ">", "<=", ">="),
            $._expression,
          ),
        ),
      ),

    call_expression: ($) =>
      prec(
        PREC.call,
        seq(
          field("function", choice($.identifier, $.field_expression)),
          "(",
          optional(commaSep($._expression)),
          ")",
        ),
      ),

    field_expression: ($) =>
      prec(
        PREC.member,
        seq(field("object", $.identifier), ".", field("field", $.identifier)),
      ),

    new_expression: ($) =>
      seq("new", $.identifier, "(", optional(commaSep($._expression)), ")"),

    // --- Types ---
    type: ($) =>
      choice(
        $.java_type,
        "string",
        "map",
        "int",
        "float",
        "double",
        "boolean",
        "void",
        $.identifier,
      ),

    java_type: ($) => seq("java", "(", $.java_type_identifier, ")"),

    // A flexible rule to capture complex Java types like Map<String, Object>
    java_type_identifier: ($) =>
      seq($.qualified_name, optional(seq("<", commaSep1($.type), ">"))),

    modifier_list: ($) => repeat1(choice("public", "private", "protected")),

    variable_declaration: ($) =>
      seq(
        optional($.modifier_list),
        field("type", $.type),
        field("name", $.identifier),
        ";",
      ),

    qualified_name: ($) => prec.left(sep1($.identifier, ".")),

    // --- Tokens ---
    identifier: ($) => /[a-zA-Z_][a-zA-Z0-9_]*/,

    number: ($) => /[0-9]+(\.[0-9]+)?/,

    string_literal: ($) => seq('"', repeat(choice(/[^"\\]+/, /\\./)), '"'),

    comment: ($) =>
      token(
        choice(seq("//", /.*/), seq("/*", /[^*]*\*+([^/*][^*]*\*+)*/, "/")),
      ),
  },
});

// Helper: one or more rule separated by a separator
function sep1(rule, separator) {
  return seq(rule, repeat(seq(separator, rule)));
}
