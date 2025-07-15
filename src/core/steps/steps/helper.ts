export function replacePlaceholders(
  obj: any,
  params: Record<string, any>,
): any {
  // null or undefined, just return
  if (obj == null) {
    return obj;
  }

  // If it's a string, do a global placeholder replace
  if (typeof obj === 'string') {
    return obj.replace(/\{(\w+)\}/g, (match, key) => {
      // If the param isn't provided, replace with empty string or do something else

      const val = params[key];
      return val === undefined ? '' : val;
    });
  }

  // If it's an array, map each element
  if (Array.isArray(obj)) {
    return obj.map((item) => replacePlaceholders(item, params));
  }

  // If it's an object, recurse on each property
  if (typeof obj === 'object') {
    const output: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      output[k] = replacePlaceholders(v, params);
    }
    return output;
  }

  // If it's some other type (number, boolean), just return as is
  return obj;
}

export function getNestedProperty(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') {
      throw new Error(
        `Cannot read property '${part}' on non-object (while traversing '${path}')`,
      );
    }
    if (!(part in current)) {
      throw new Error(
        `Property '${part}' does not exist on current object (while traversing '${path}')`,
      );
    }
    current = current[part];
  }
  return current;
}

export interface StepCondition {
  field: string;
  operator:
    | 'equals'
    | 'does_not_equal'
    | 'is_less_than'
    | 'is_greater_than'
    | 'is_less_than_or_equal_to'
    | 'is_greater_than_or_equal_to';
  value: any;
  join?: 'and' | 'or'; // defaults to 'and' if not specified
}

export function evaluateConditions(
  conditions: StepCondition[] = [],
  context: Record<string, any>,
): boolean {
  let resultSoFar = true; // for the first condition
  let lastJoin: 'and' | 'or' = 'and';

  for (let i = 0; i < conditions.length; i++) {
    const cond = conditions[i];
    const leftValue = context[cond.field]; // or context.inputs[cond.field], etc.
    const operator = cond.operator;
    const rightValue = cond.value;

    let condResult: boolean;

    switch (operator) {
      case 'equals':
        condResult = leftValue === rightValue;
        break;
      case 'does_not_equal':
        condResult = leftValue !== rightValue;
        break;
      case 'is_less_than':
        condResult = Number(leftValue) < Number(rightValue);
        break;
      case 'is_greater_than':
        condResult = Number(leftValue) > Number(rightValue);
        break;
      case 'is_less_than_or_equal_to':
        condResult = Number(leftValue) <= Number(rightValue);
        break;
      case 'is_greater_than_or_equal_to':
        condResult = Number(leftValue) >= Number(rightValue);
        break;
      default:
        condResult = false; // or throw an error
    }

    // Combine with the running total using lastJoin
    if (lastJoin === 'and') {
      resultSoFar = resultSoFar && condResult;
    } else {
      // lastJoin === 'or'
      resultSoFar = resultSoFar || condResult;
    }

    lastJoin = cond.join ?? 'and'; // track the join for the next condition
  }

  return resultSoFar;
}
