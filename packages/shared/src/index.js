/**
 * CrewHive Shared Package (@crew-hive/shared)
 * Universal business logic, role taxonomy, constants, validators, and API contracts.
 */

export * from "./constants/index.js";
export * from "./enums/index.js";
export * from "./role-taxonomy/index.js";
export * from "./cities/index.js";
export * from "./validation/index.js";
export * from "./api-contracts/index.js";
export * from "./utils/index.js";
export * from "./schemas/index.js";

import constants from "./constants/index.js";
import enums from "./enums/index.js";
import roleTaxonomy from "./role-taxonomy/index.js";
import cities from "./cities/index.js";
import validation from "./validation/index.js";
import apiContracts from "./api-contracts/index.js";
import utils from "./utils/index.js";

export default {
  constants,
  enums,
  roleTaxonomy,
  cities,
  validation,
  apiContracts,
  utils,
};

