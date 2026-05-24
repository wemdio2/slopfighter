import paddingComments from './padding-comments.mjs';
import uselessTryCatch from './useless-try-catch.mjs';
import deadImports from './dead-imports.mjs';
import explicitAny from './explicit-any.mjs';
import futureProofNaming from './future-proof-naming.mjs';
import alwaysTrueConditional from './always-true-conditional.mjs';
import excessiveJsdoc from './excessive-jsdoc.mjs';
import redundantErrorRethrow from './redundant-error-rethrow.mjs';
import singleMethodClass from './single-method-class.mjs';
import overDefensiveNullCheck from './over-defensive-null-check.mjs';
import commentedOutCode from './commented-out-code.mjs';
import unnecessaryAsync from './unnecessary-async.mjs';
import trivialArrowWrapper from './trivial-arrow-wrapper.mjs';
import redundantAwait from './redundant-await.mjs';
import returnUndefined from './return-undefined.mjs';
import elseAfterReturn from './else-after-return.mjs';
import redundantBooleanCast from './redundant-boolean-cast.mjs';
import constStringConcat from './const-string-concat.mjs';

export const allRules = [
  paddingComments,
  uselessTryCatch,
  deadImports,
  explicitAny,
  futureProofNaming,
  alwaysTrueConditional,
  excessiveJsdoc,
  redundantErrorRethrow,
  singleMethodClass,
  overDefensiveNullCheck,
  commentedOutCode,
  unnecessaryAsync,
  trivialArrowWrapper,
  redundantAwait,
  returnUndefined,
  elseAfterReturn,
  redundantBooleanCast,
  constStringConcat,
];
