import { jest } from "@jest/globals";
import { driftmock } from "./drift";

export default jest.fn(() => {
  window.drift = driftmock;
  return true;
});
