import { simple } from "acorn-walk";
import { parse } from "acorn";
import { DiscordExperiment, DiscordScript } from "../types";

function getValueFromExpression(object: Array<any>, valueKey: string) {
  return object.find((prop) => {
    if (prop.key == undefined) {
      return;
    }
    return prop.key.name == valueKey;
  });
}

function isEnumExpression(node: any) {
  if (node.type !== "MemberExpression") return false;

  if (node.object.type === "MemberExpression" && !node.computed) {
    return isEnumExpression(node.object);
  } else if (node.object.type === "Identifier" && !node.computed) {
    return node.property.type === "Identifier";
  }

  return false;
}

function astToJSValue(
  node: any,
  options?: {
    ignoreFields?: string[];
    ignoreErrors?: boolean;
    fieldsWhitelist?: string[];
  }
) {
  if (node.type === "Literal") {
    return node.value;
  } else if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis.map((x) => x.value.cooked).join("");
  } else if (node.type === "ObjectExpression") {
    let obj: any = {};

    for (const prop of node.properties) {
      if (!prop.key) continue;

      let name: string;
      if (prop.key.type === "Identifier") name = prop.key.name;
      else if (prop.key.type === "Literal") name = prop.key.value;

      //@ts-expect-error
      if (options?.ignoreFields && options?.ignoreFields.includes(name))
        continue;
      //@ts-expect-error
      if (options?.fieldsWhitelist && !options?.fieldsWhitelist.includes(name))
        continue;
      //@ts-expect-error
      obj[name] = astToJSValue(prop.value, options);
    }

    return obj;
  } else if (node.type === "ArrayExpression") {
    return node.elements.map((elem: any) => astToJSValue(elem, options));
  } else if (node.type === "Identifier") {
    //return node.name
  } else if (node.type === "UnaryExpression" && node.operator === "!") {
    return !astToJSValue(node.argument, options);
  } else if (node.type === "UnaryExpression" && node.operator === "-") {
    return -astToJSValue(node.argument, options);
  } else if (isEnumExpression(node)) {
    //return node.property.name
  }

  if (options?.ignoreErrors) {
    return null;
  }
  throw new Error(`Unsupported node type ${node.type}`);
  //return this.script.substring(node.start, node.end)
}

export async function extractExperiments(source: string) {
  const experiments: DiscordExperiment[] = [];
  try {
    const ast = parse(source, {
      ecmaVersion: "latest",
    });

    simple(ast, {
      ObjectExpression(node: any) {
        const properties = node.properties as Array<any>;
        const treatments = getValueFromExpression(properties, "treatments");

        if (treatments != undefined) {
          const kind = getValueFromExpression(properties, "kind");
          const id = getValueFromExpression(properties, "id");
          const label = getValueFromExpression(properties, "label");
          let treatmentsObject = [];

          try {
            treatmentsObject = astToJSValue(treatments.value);
          } catch (err) {
            console.error(
              `Could not parse treatments of experiment ${id.value.value}: ${err.message}`
            );
          }

          experiments.push({
            kind: kind.value.value,
            id: id.value.value,
            label: label.value.value,
            treatments: treatmentsObject,
          });
        }
      },
    });
  } catch (err) {
    console.error(`Could not process a file: ${err.message}`);
    console.log(source);
  }
  return experiments;
}
