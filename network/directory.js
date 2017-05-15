var directory = {};
var names = [];

class EndPoint {
  constructor(endPointName) {
    this.messages = [];
    directory[endPointName] = this;
    names.push(endPointName);
  }
  static get(endPointName) {
    return directory[endPointName];
  }
  static getOrCreate(endPointName) {
    if (directory[endPointName]==null) {
      directory[endPointName] = new EndPoint(endPointName);
    }
    return directory[endPointName];
  }
  static getNames() {
    return names;
  }
  getMessages() {
    var res = this.messages;
    this.messages = [];
    return res;
  }
  newMessage(from, method, data) {
    var msg = {from, method};
    if (data!=null && data.search(/\S/)>=0)
      msg.data = data;
    this.messages.push(msg);
  }
}

module.exports = EndPoint;
