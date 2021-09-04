import { jest } from "@jest/globals";
import { buildDriftMock } from "./drift";

export default jest.fn(() => {
  console.log("here3");
  window.drift = buildDriftMock();
  return true;
});
