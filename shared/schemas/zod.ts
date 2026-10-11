import { z } from "zod";

/**
 * Friendlier fallback messages for any rule that doesn't set its own.
 * Import `z` from this file (not "zod") so the config is always applied.
 */
z.config({
  customError: (issue) => {
    switch (issue.code) {
      case "invalid_type":
        if (issue.input === undefined || issue.input === null || issue.input === "") {
          return "This field is required";
        }
        if (issue.expected === "number") return "Please enter a number";
        return "This value isn't valid";

      case "too_small":
        if (issue.origin === "string") {
          return Number(issue.minimum) <= 1
            ? "This field is required"
            : `Must be at least ${issue.minimum} characters`;
        }
        if (issue.origin === "number") return `Must be ${issue.minimum} or more`;
        if (issue.origin === "array") return `Choose at least ${issue.minimum}`;
        return undefined;

      case "too_big":
        if (issue.origin === "string") return `Must be ${issue.maximum} characters or fewer`;
        if (issue.origin === "number") return `Must be ${issue.maximum} or less`;
        if (issue.origin === "array") return `Choose no more than ${issue.maximum}`;
        return undefined;

      case "invalid_format":
        if (issue.format === "email") return "Please enter a valid email address";
        if (issue.format === "url") return "Please enter a valid URL, e.g. https://example.com";
        return "This value isn't in the right format";

      default:
        return undefined;
    }
  },
});

export { z };
