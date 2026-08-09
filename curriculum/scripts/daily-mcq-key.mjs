#!/usr/bin/env node
/** Emit one private balanced A–E answer-position permutation for a five-MCQ block. */
import { randomInt } from 'node:crypto';
import balanceModule from '../../sce-mcq-balance.js';

const random = () => randomInt(0, 1_000_000_000) / 1_000_000_000;
const correctOptions = balanceModule.balancedMcqKey(random);
console.log(JSON.stringify({ correctOptions }));
