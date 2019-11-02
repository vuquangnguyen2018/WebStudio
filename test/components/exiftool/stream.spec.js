const childProcess = require('child_process')
const debug = require('debug')
const mockSpawn = require('mock-spawn')
const should = require('should/as-function')
const sinon = require('sinon')
const exifStream = require('../../../src/components/exiftool/stream')

describe('exiftool stream', function () {
  beforeEach(() => {
    sinon.stub(childProcess, 'spawn')
    debug.reset()
  })

  afterEach(() => {
    childProcess.spawn.restore()
  })

  it('parses exiftool JSON output into an array', (done) => {
    // setup a mock that returns exiftool-like JSON data
    const errorSpawn = mockSpawn()
    childProcess.spawn.callsFake(errorSpawn)
    errorSpawn.setDefault(function (cb) {
      setTimeout(() => {
        this.stdout.write(`[{
          "SourceFile": "IMG_0001.jpg",
          "MIMEType": "image/jpeg"
        },`)
      }, 10)
      setTimeout(() => {
        this.stdout.write(`{
          "SourceFile": "IMG_0002.jpg",
          "MIMEType": "image/jpeg"
        }]`)
      }, 20)
      setTimeout(() => cb(), 30)
    })
    // check the data returned
    const stream = exifStream.parse('input', ['IMG_0001.jpg', 'IMG_0002.jpg'])
    reduceStream(stream, emittedData => {
      should(emittedData).eql([{
        SourceFile: 'IMG_0001.jpg',
        MIMEType: 'image/jpeg'
      },
      {
        SourceFile: 'IMG_0002.jpg',
        MIMEType: 'image/jpeg'
      }])
      done()
    })
  })

  it('returns an empty array and prints an error if exiftool is not available', (done) => {
    // setup a mock that always fails
    const errorSpawn = mockSpawn()
    childProcess.spawn.callsFake(errorSpawn)
    errorSpawn.setDefault(function (cb) {
      this.emit('error', new Error('spawn ENOENT'))
      setTimeout(() => cb(), 10)
    })
    // check the data returned
    const stream = exifStream.parse('input', ['IMG_0001.jpg'])
    reduceStream(stream, emittedData => {
      should(emittedData).eql([])
      debug.assertContains('installed on your system')
      debug.assertContains('spawn ENOENT')
      done()
    })
  })
})

function reduceStream (stream, done) {
  const emittedData = []
  stream.on('data', entry => {
    emittedData.push(entry)
  }).on('end', () => {
    done(emittedData)
  })
}
