import test from 'node:test';
import assert from 'node:assert/strict';
import {endingFeedback} from '../dist/game.mjs';
test('ending distinguishes no independent successes, partial success and both benchmarks',()=>{
 assert.equal(endingFeedback({rays:0,routes:0}),'More independent practice recommended');
 for(const scores of [{rays:2,routes:1},{rays:2,routes:2},{rays:3,routes:1},{rays:0,routes:3},{rays:4,routes:0}])assert.equal(endingFeedback(scores),'Keep it up—you’ll do better next time!');
 for(const scores of [{rays:3,routes:2},{rays:4,routes:3}])assert.equal(endingFeedback(scores),'Both learning targets demonstrated independently!');
});
