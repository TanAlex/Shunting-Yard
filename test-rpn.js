function tokenize(inputString){
  return inputString.match(/((\w+)\s*([=><!]+)\s*(\"[ \w]+\"|\'[ \w]+\'|\w+))|\(|\)|\bAND\b|\bOR\b|\bNOT\b/ig);
}

function yard(tokens){
  let ops = {'or': 1, 'and': 2, 'not': 3};
  let peek = (a) => a[a.length - 1];
  let stack = [];

  return tokens.reduce((output, token) => {
      if (token.match(/(\w+)\s*([=><!]+)\s*(["' \w]+)/)) {
        output.push(token);
      }

      if (token in ops) {
        while (peek(stack) in ops && ops[token] <= ops[peek(stack)])
          output.push(stack.pop());
        stack.push(token);
      }

      if (token == '(') {
        stack.push(token);
      }

      if (token == ')') {
        while (peek(stack) != '(')
          output.push(stack.pop());
        stack.pop();
      }

      return output;
    }, [])
    .concat(stack.reverse())
};

function rpn(ts, queryObject, s = []){
  let i = 0;
  ts.forEach(t => {
    if (t.match(/and|&&/i)) { let p1 = procExpression(queryObject,s.splice(-2,1)[0]); let p2 = procExpression(queryObject,s.pop()); s.push( p1 && p2); }
    else if (t.match(/or|\|\|/i)) { let p1 = procExpression(queryObject,s.splice(-2,1)[0]); let p2 = procExpression(queryObject,s.pop()); s.push( p1 || p2)}
    else if (t.match(/not|!/i)) s.push(! procExpression(queryObject, s.pop()));
    else s.push (t);
    console.log(i, ":", t, s);
    i++;
  });
  return s[0];
}

function procExpression(queryObject, queryString){
  if (queryString === true || queryString === false ) return queryString;
  queryString = queryString.replace(/=/,"==");
  var matches = queryString.match(/(\w+)\s*([=><!]+)\s*(["' \w]+)/);
  //console.log("matches:", matches);
  if (matches){
    console.log(queryObject+queryString);
    return eval (queryObject+queryString);
    
  }
  else return false;
}

// function procExpression(queryObject, queryString){
//   if (queryString === true || queryString === false ) return queryString;
//   var matches = queryString.match(/(\w+)\s*([=><!]+)\s*(["'_\w]+)/);
//   //console.log("matches:", matches);
//   if (matches){
//     var p1 = matches[1], p2 = matches[3].replace(/["']/g, "");
//     //console.log("p1, p2:", p1, p2);
//     switch (matches[2]){
//       case ">" : return queryObject[p1] > p2;
//       case "<" : return queryObject[p1] < p2;
//       case "=" : return queryObject[p1] == p2;
//       case "!=" : return queryObject[p1] != p2;
//       case ">=" : return queryObject[p1] >= p2;
//       case "<=" : return queryObject[p1] <= p2;
//     }
    
//   }
//   else return false;
// }

var UserData = [
  { name: "TTL", age: 18, id :1  },
  { name: "SilverCow", age: 22, id :2  },
  { name: "NorthWind", age: 78, id :3  }
]

var user = UserData[0];

var tokens = tokenize(`name = 'TT LL ' and not(age < 40 or id > 1)`);
console.log("tokens:",tokens);
var result = yard(tokens);
console.log("yard result:",result);
//var final = rpn(result, user);   // regular way to call processExpression 
var final = rpn(result, "user.");  // use eval() in processExpression
console.log("rpn result:",final);
