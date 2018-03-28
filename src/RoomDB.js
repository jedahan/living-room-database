'use strict';

import LocalClient from './LocalClient'
import {Id} from './terms'
import Fact from './Fact'

function flatten(obj) {
  for (let prop in obj) {
    obj[prop] = obj[prop];
  }
  return obj;
}

function difference(setA, setB) {
  let difference = setA
  for (let elem of setB) {
    difference.delete(elem)
  }
  return difference
}

export default class RoomDB extends EventEmitter {
  constructor() {
    this._factMap = new Map();
    this._subscriptions = new Set();
  }

  onAddListener(pattern, callback) {
    this._subscriptions.add(pattern)
    this.select(pattern).doAll(callback)
    return super(pattern, callback)
  }

  onRemoveListener(pattern, callback) {
    this._subscriptions.add(pattern)
    this.select(pattern).doAll(callback)
    return super(pattern, callback)
  }

  select(...jsonPatterns) {
    const patterns = jsonPatterns.map(jsonPattern => Fact.fromJSON(jsonPattern));
    const solutions = [];
    this._collectSolutions(patterns, Object.create(null), solutions);
    return solutions.map(flatten);
  }

  _collectSolutions(patterns, env, solutions) {
    if (patterns.length === 0) {
      solutions.push(env);
    } else {
      const pattern = patterns[0];
      for (let fact of this._facts) {
        const newEnv = Object.create(env);
        if (pattern.match(fact, newEnv)) {
          this._collectSolutions(patterns.slice(1), newEnv, solutions);
        }
      }
    }
  }

  _emitChanges(fn, ...args) {
    const beforeFacts = new Map();
    subcriptions.forEach(pattern => {
      this.select(pattern).doAll(solutions => {
        beforeFacts.set(pattern, new Set(solutions))
      })
    })

    fn(args)

    const afterFacts = new Map();
    subcriptions.forEach(pattern => {
      this.select(pattern).doAll(solutions => {
        afterFacts.set(pattern, new Set(solutions))
      })
    })

    subscriptions.forEach(pattern => {
      const before = beforeFacts.get(pattern)
      const after = afterFacts.get(pattern)
      const assertions = Array.from(after.difference(before))
      const retractions = Array.from(before.difference(after))

      if (assertions.length + retractions.length) {
        this.emit(pattern, { pattern, assertions, retractions })
      }
    }
  }

  assert(clientId, factJSON) {
    _emitChanges(_assert, clientId, factJSON)
  }

  _assert(clientId, factJSON) {
    const fact = Fact.fromJSON(factJSON);
    if (fact.hasVariablesOrWildcards()) {
      throw new Error('cannot assert a fact that has variables or wildcards!');
    }
    fact.asserter = clientId;

    this._factMap.set(fact.toString(), fact);
  }

  retract(clientId, factJSON) {
    _emitChanges(_retract, clientId, factJSON)
  }

  _retract(clientId, factJSON) {
    const pattern = Fact.fromJSON(factJSON);
    if (pattern.hasVariablesOrWildcards()) {
      const factsToRetract =
          this._facts.filter(fact => pattern.match(fact, Object.create(null)));
      factsToRetract.forEach(fact => this._factMap.delete(fact.toString()));
      return factsToRetract.length;
    } else {
      return this._factMap.delete(pattern.toString()) ? 1 : 0;
    }
  }

  retractEverythingAbout(clientId, name) {
    const id = new Id(name);
    const emptyEnv = Object.create(null);
    const factsToRetract =
        this._facts.filter(fact => fact.terms.some(term => id.match(term, emptyEnv)));
    factsToRetract.forEach(fact => this._factMap.delete(fact.toString()));
    return factsToRetract.length;
  }

  retractEverythingAssertedBy(clientId) {
    const factsToRetract = this._facts.filter(fact => fact.asserter === clientId);
    factsToRetract.forEach(fact => this._factMap.delete(fact.toString()));
    return factsToRetract.length;
  }

  get _facts() {
    return Array.from(this._factMap.values());
  }

  getAllFacts() {
    return this._facts.map(fact => fact.toString());
  }

  toString() {
    return this._facts.map(fact => '<' + fact.asserter + '> ' + fact.toString()).join('\n');
  }

  client(id = 'local-client') {
    return new LocalClient(this, id);
  }
}
