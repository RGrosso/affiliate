export type LoginErrorData = {
  code: "INVALID_CREDENTIALS" | "USER_NOT_FOUND" | "INVALID_FORMAT";
  message: string;
};
