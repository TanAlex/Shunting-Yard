## RPN and Shunting-yard algorithm to implement a simple query parser
### Overview
I was learning GraphQL specs and run into an idea, that is why only query `{id: Number}`, 
we should be able to query something like `{query: "name = 'TT LL' and not(age < 40 or id > 1)"}`

In order to parse the query string like that, I have to use some CS algorithms.

The easiest one I found is the 
* [Shunting-yard algorithm ](https://en.wikipedia.org/wiki/Shunting-yard_algorithm)
* [Reverse Polish notation (RPN)](https://en.wikipedia.org/wiki/Reverse_Polish_notation)

### Implementation
You can refer to the reference links above to understand how those 2 algorithm work.

There is a simple implementation I borrowed. <br>
http://eddmann.com/posts/implementing-the-shunting-yard-algorithm-in-javascript/


For my queries like `{name = 'TT LL' and not(age < 40 or id > 1)}`, the following is my strategies.

First of all, I need to tokenize the string
The function I wrote is like this:
```js
function tokenize(inputString){
  return inputString.match(/((\w+)\s*([=><!]+)\s*(\"[ \w]+\"|\'[ \w]+\'|\w+))|\(|\)|\bAND\b|\bOR\b|\bNOT\b/ig);
}
```

This will turn my query `{name = 'TT LL' and not(age < 40 or id > 1)}`
to tokens like
```js
tokens: 
[ 
  'name = \'TT LL\'',
  'and',
  'not',
  '(',
  'age < 40',
  'or',
  'id > 1',
  ')' 
]
```

The `((\w+)\s*([=><!]+)\s*(\"[ \w]+\"|\'[ \w]+\'|\w+))` looks convoluted, but it is actually just
trying to match an express like `name = "string with space"` or express with no space `id > 1`

### Use Shunting-yard algorithm to convert the token array to a new token array that follows RPN rules
```js
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
```

After going through the `yard(tokens)` function above, the tokens got turned into:
```js
yard result: [ 'name = \'TT LL \'', 'age < 40', 'id > 1', 'or', 'not', 'and' ]
```

The result is a standard RPN notation stack. So we can process it

```js
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
```

The procExpression function is just to evaluate the express like `age < 40` and `id > 1` or `name = "TTL"`
We can simply use eval() like this:
```js
function procExpression(queryObject, queryString){
  if (queryString === true || queryString === false ) return queryString;
  queryString = queryString.replace(/=/,"==");
  return eval (queryObject + queryString);
}
```

The `eval()` is always not ideal as it might be vulnerable for injection attack
I come up with a more verbose but safer one
```js
function procExpression(queryObject, queryString){
  if (queryString === true || queryString === false ) return queryString;
  var matches = queryString.match(/(\w+)\s*([=><!]+)\s*(["'_\w]+)/);
  //console.log("matches:", matches);
  if (matches){
    var p1 = matches[1], p2 = matches[3].replace(/["']/g, "");
    //console.log("p1, p2:", p1, p2);
    switch (matches[2]){
      case ">" : return queryObject[p1] > p2;
      case "<" : return queryObject[p1] < p2;
      case "=" : return queryObject[p1] == p2;
      case "!=" : return queryObject[p1] != p2;
      case ">=" : return queryObject[p1] >= p2;
      case "<=" : return queryObject[p1] <= p2;
    }
    
  }
  else return false;
}
```

Now we can perform some tests
```js
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
```

The result looks like this:
```js
tokens: [ 'name = \'TT LL \'',
  'and',
  'not',
  '(',
  'age < 40',
  'or',
  'id > 1',
  ')' ]
yard result: [ 'name = \'TT LL \'', 'age < 40', 'id > 1', 'or', 'not', 'and' ]
0 ':' 'name = \'TT LL \'' [ 'name = \'TT LL \'' ]
1 ':' 'age < 40' [ 'name = \'TT LL \'', 'age < 40' ]
2 ':' 'id > 1' [ 'name = \'TT LL \'', 'age < 40', 'id > 1' ]
user.age < 40
user.id > 1
3 ':' 'or' [ 'name = \'TT LL \'', true ]
4 ':' 'not' [ 'name = \'TT LL \'', false ]
user.name == 'TT LL '
5 ':' 'and' [ false ]
rpn result: false
```

This is really a simple but super powerful way to parse query and generate dynamic result.
