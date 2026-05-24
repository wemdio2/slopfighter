import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { format } from 'node:util';

// This function gets the user name
function getUserName(user: any): string {
  // Return the user name
  return user.name;
}

/**
 * Helper function to add two numbers together.
 *
 * @param a - the first number
 * @param b - the second number
 * @returns the sum
 * @example
 *   addNumbers(1, 2) // => 3
 */
function addNumbers(a: number, b: number): number {
  return a + b;
}

class UserManager {
  getUser(id: string): any {
    return { id };
  }
}

class StringHelper {
  static reverse(s: string): string {
    return s.split('').reverse().join('');
  }
}

function loadConfig(path: string) {
  try {
    return readFileSync(path, 'utf8');
  } catch (e) {
    console.error(e);
    throw e;
  }
}

function parseJson(text: string) {
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error((e as Error).message);
  }
}

function isValid(x: string | null | undefined) {
  if (x !== null && x !== undefined && x) {
    return true;
  }
  return false;
}

function alwaysRuns() {
  if (true) {
    console.log('hello');
  }
}

export { getUserName, addNumbers, loadConfig, parseJson, isValid, alwaysRuns };
