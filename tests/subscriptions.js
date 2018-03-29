const test = require('ava')
const RoomDB = require('../dist/roomdb.js')

const gorogInitial = `gorog is a barbarian at 40, 50`

test('assert adds to the log', async t => {
  const room = new RoomDB()
  const client = room.client()

  client.subscribe('$name is a $class at $x, $y', obj => {
    t.deepEqual(obj, {})
  })

  client.assert(gorogInitial)
  await client.flushChanges()
})
