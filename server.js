var express = require('express');
var graphqlHTTP = require('express-graphql');
var { buildSchema } = require('graphql');


// Client Query API looks like this
// {
//   Users{
//    getUsers(query: "id > 1 && name !='SilverCow' "){
//      id
//      name
//      age
//    }
//   }
// }


// Construct a schema, using GraphQL schema language
var schema = buildSchema(`
  type User {
    name: String
    age: Int
    id: Int
  }

  input UserQueryInput {
    name: String
    age: Int
    id: Int
  }

  type UserClass {
    getUsers(query: String, limit: String) : UserMeta
    getUser (query: String!) : User
  }

  type UserMeta {
    data: [User]
    totalCount: Int
    pageSize: Int
    pageNum: Int
  }

  type Query {
    Users: UserClass
  }
`);

var UserData = [
  { name: "TTL", age: 18, id :1  },
  { name: "SilverCow", age: 22, id :2  },
  { name: "NorthWind", age: 78, id :3  }
]

function performQueryString(queryObject, queryString){
  var groups = queryString.split(/AND|&&|OR|\|\|/i);
  
  var match = queryString.match(/AND|&&|OR|\|\|/ig);

  var result = performOneCondition(queryObject,groups[0]);
  var operators = match || [];
  console.log("performQueryString ---------------------");
  console.log("result at top:", result);
  // console.log("match:", match);
  // console.log("groups:", groups);
  // console.log("operators:", operators);
  
  for (var i=1, j=0; i < groups.length; i++, j++){
    if (j >= operators.length) break;
    console.log("i:", i);
    console.log("operator:", operators[j]);
    switch (operators[j].toLowerCase()) {
      case "&&":
      case "and": result = result && performOneCondition(queryObject,groups[i]); break;
      case "||":
      case "or": result = result || performOneCondition(queryObject,groups[i]); break;
    }

    console.log("result:", result);
  }
  console.log("result at end:", result);
  return result;
}

function performOneCondition(queryObject, queryString){
  var matches = queryString.match(/(\w+)\s*([=><!]+)\s*(["'_\w]+)/);
  console.log("matches:", matches);
  if (matches){
    var p1 = matches[1], p2 = matches[3].replace(/["']/g, "");
    console.log("p1, p2:", p1, p2);
    switch (matches[2]){
      case ">" : return queryObject[p1] > p2;
      case "<" : return queryObject[p1] < p2;
      case "=" : return queryObject[p1] == p2;
      case "!=" : return queryObject[p1] != p2;
      case ">=" : return queryObject[p1] >= p2;
      case "<=" : return queryObject[p1] <= p2;
    }
    
  }else return false;
}

var LIMIT_DEFAULT = {
  limit: 10,  // 10 entries per page
  page: 0,    // first page
}

function getLimitationString (limitation){
  var result = "";
  if (limitation.orderBy){
    result = "ORDERBY " + limitation.orderBy
  }
  if (limitation.limit){ 
    result += "LIMIT "+ String(limitation.page * limitation.limit), + " ,"+ limitation.limit;
  }
}

// This class implements the RandomDie GraphQL type
class UserClass {
  constructor(users){
    this.users = users;
  }
  getUsers({query, limit}) {
    if (typeof limit != "undefined"){
      var limitation = JSON.parse(limit);
      limitation = Object.assign({}, LIMIT_DEFAULT, limitation);
    }

    var userMeta = {
      totalCount: 3,
      pageSize: 2,
      pageNum: 1
    }

    userMeta.data = this.users.filter((user)=> {var result = performQueryString(user, query); console.log(result); return result});
    return userMeta;
  }
  getUser({query}){
    // var findFunc;
    // if (typeof query.id != "undefined"){
    //   findFunc = (user) => user.id == query.id
    // }
    // return this.users.find(findFunc);
    console.log("query:", query);
    
    return this.users.find((user)=> {var result = performQueryString(user, query); console.log(result); return result});
  }
}

// The root provides the top-level API endpoints
var root = {
  Users: function () {
    return new UserClass(UserData);
  }
}

var app = express();
app.use('/graphql', graphqlHTTP({
  schema: schema,
  rootValue: root,
  graphiql: true,
}));
app.listen(4000);
console.log('Running a GraphQL API server at localhost:4000/graphql');