var Imap = require('imap'),
	inspect = require('util').inspect;
var fs = require('fs'), fileStream;
var criterias = [];

var imap = new Imap({
  user: 'jsguru@tancou.fr',
  password: 'cczOCdBXbKTpYwNjhh9b',
  host: 'mail.gandi.net',
  port: 993,
  tls: true
});

function openInbox(cb) {
  imap.openBox('INBOX', true, cb);
}

function extractMessags(w_results) {
	var uid, weight, header, flags, matched_keywords, domain,
			msgArrByDomain = {},		
			u_results = Object.keys(w_results).map(ele => +ele);

	// var f = imap.fetch(w_results, { bodies: '' });
	// var f = imap.fetch(w_results, { bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)','TEXT'] });
	var f = imap.fetch(u_results, { bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE)' });
	f.on('message', function(msg, seqno) {
		console.log('Message #%d', seqno);
		var prefix = '(#' + seqno + ') ';
		msg.on('body', function(stream, info) {
			// console.log(prefix + 'Body', info.which);
			// stream.pipe(fs.createWriteStream('msg-' + seqno + '-body.txt', {'flags': 'a'}));
			var buffer = '';
			stream.on('data', function(chunk) {
				buffer += chunk.toString('utf8');
			});
			stream.once('end', function() {
				header = Imap.parseHeader(buffer);
				var sender = header.from[0].split('<').pop().split('>').shift();
				domain = sender.split('@').pop();
				// console.log(prefix + 'Parsed header: %s', inspect(header));
			});
		});
		msg.once('attributes', function(attrs) {
			// console.log(prefix + 'Attributes: %s', inspect(attrs, false, 8));
			uid = attrs.uid;
			weight = w_results[uid];
			flags = attrs.flags;
			// console.log(prefix + 'struct: %s', inspect(attrs.struct, false, 8));
		});
		msg.once('end', function() {
			var msgInfo = {uid, weight, flags, header};
			(msgArrByDomain[domain] = msgArrByDomain[domain] || []).push(msgInfo);
			// console.log(prefix + 'message Info:', msgInfo);
			console.log(prefix + 'Finished');
		});
	});
	f.once('error', function(err) {
		console.log('Fetch error: ' + err);
	});
	f.once('end', function() {
		for (domain in msgArrByDomain) {
			msgArrByDomain[domain].sort((obj1, obj2) => {
				return (obj2.weight - obj1.weight)
			});
		}
		
		var finalResult = {};
		finalResult.emails = {domains: msgArrByDomain};
		console.log('Final Results', inspect(finalResult, false, 8));
		console.log('Done fetching all messages!');
		fs.writeFileSync('./data.json', inspect(finalResult, false, 8), 'utf-8');
		imap.end();
	});
}

imap.once('ready', function() {
	/*
  openInbox(function(err, box) {
    if (err) throw err;
    var f = imap.seq.fetch('1:3', {
      bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE)',
      struct: true
    });
    f.on('message', function(msg, seqno) {
      console.log('Message #%d', seqno);
      var prefix = '(#' + seqno + ') ';
      msg.on('body', function(stream, info) {
        var buffer = '';
        stream.on('data', function(chunk) {
          buffer += chunk.toString('utf8');
        });
        stream.once('end', function() {
          console.log(prefix + 'Parsed header: %s', inspect(Imap.parseHeader(buffer)));
        });
      });
      msg.once('attributes', function(attrs) {
        console.log(prefix + 'Attributes: %s', inspect(attrs, false, 8));
      });
      msg.once('end', function() {
        console.log(prefix + 'Finished');
      });
    });
    f.once('error', function(err) {
      console.log('Fetch error: ' + err);
    });
    f.once('end', function() {
      console.log('Done fetching all messages!');
      imap.end();
    });
	});
	*/
	/*
	openInbox(function(err, box) {
		if (err) throw err;
		var f = imap.seq.fetch(box.messages.total + ':*', { bodies: ['HEADER.FIELDS (FROM)','TEXT'] });
		f.on('message', function(msg, seqno) {
			console.log('Message #%d', seqno);
			var prefix = '(#' + seqno + ') ';
			msg.on('body', function(stream, info) {
				if (info.which === 'TEXT')
					console.log(prefix + 'Body [%s] found, %d total bytes', inspect(info.which), info.size);
				var buffer = '', count = 0;
				stream.on('data', function(chunk) {
					count += chunk.length;
					buffer += chunk.toString('utf8');
					if (info.which === 'TEXT')
						console.log(prefix + 'Body [%s] (%d/%d)', inspect(info.which), count, info.size);
				});
				stream.once('end', function() {
					if (info.which !== 'TEXT')
						console.log(prefix + 'Parsed header: %s', inspect(Imap.parseHeader(buffer)));
					else
						console.log(prefix + 'Body [%s] Finished', inspect(info.which));
				});
			});
			msg.once('attributes', function(attrs) {
				console.log(prefix + 'Attributes: %s', inspect(attrs, false, 8));
			});
			msg.once('end', function() {
				console.log(prefix + 'Finished');
			});
		});
		f.once('error', function(err) {
			console.log('Fetch error: ' + err);
		});
		f.once('end', function() {
			console.log('Done fetching all messages!');
			imap.end();
		});
	});
	*/
	openInbox(function(err, box) {
		if (err) throw err;
		var weightedResult = {};

		Promise.all(criterias.map((cri, idx) => {
			return searchPromise(cri, idx);
		})).then(arr => {
			arr.forEach((subArr, idx) => {
				subArr.forEach(ele => {
					var key = ele;
					if (key in weightedResult) {
						weightedResult[key] += criterias[idx].weight;
					} else {
						weightedResult[key] = criterias[idx].weight;
					}
				})
			});
			console.log('weighted result', weightedResult);
			
			extractMessags(weightedResult);
			// extractMessags({'2785': 25, '2786': 15, '2787': 10});
		});

		function searchPromise(criteriaW, index) {
			return new Promise((resolve, reject) => {
				imap.search(criteriaW.criteria, function(err, results) {
					if (err) {
						reject(err);
						throw err;
					};
					console.log(`result-${++index} UIDs: `, results);
					resolve(results);
				})
			})
		}

		// criterias.forEach(itm => {
		// 	imap.search(itm.criteria, function(err, results) {
		// 		if (err) throw err;
		// 		console.log("UIDs: ", results);
		// 		results.forEach(ele => {
		// 			var key = ele.toString();
		// 			if (key in weightedResult) {
		// 				weightedResult[key] += itm.weight;
		// 			} else {
		// 				weightedResult[key] = itm.weight;
		// 			}
		// 		});
		// 		console.log('weighted result', weightedResult);
		// 		/*
		// 		// var f = imap.fetch(results, { bodies: '' });
		// 		var f = imap.fetch(results, { bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)','TEXT'] });
		// 		// var f = imap.fetch(results, { bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE)' });
		// 		f.on('message', function(msg, seqno) {
		// 			console.log('Message #%d', seqno);
		// 			var prefix = '(#' + seqno + ') ';
		// 			msg.on('body', function(stream, info) {
		// 				console.log(prefix + 'Body', info.which);
		// 				// stream.pipe(fs.createWriteStream('msg-' + seqno + '-body.txt', {'flags': 'a'}));
		// 			});
		// 			msg.once('attributes', function(attrs) {
		// 				console.log(prefix + 'Attributes: %s', inspect(attrs, false, 8));
		// 				// console.log(prefix + 'struct: %s', inspect(attrs.struct, false, 8));
		// 			});
		// 			msg.once('end', function() {
		// 				console.log(prefix + 'Finished');
		// 			});
		// 		});
		// 		f.once('error', function(err) {
		// 			console.log('Fetch error: ' + err);
		// 		});
		// 		f.once('end', function() {
		// 			console.log('Done fetching all messages!');
		// 			imap.end();
		// 		});
		// 		*/
		// 	});
		// });
		// console.log('weighted result', weightedResult);
	});
});

imap.once('error', function(err) {
  console.log(err);
});

imap.once('end', function() {
  console.log('Connection ended');
});

(function(){
	var search_terms = [
		{
			"weight": 15,
			"addWeight": {
				"SEEN" : 2,
				"ANSWERED": -3
			},
			"flags": [
				"UNDRAFT", "UNDELETED"
			],
			"keywords": ["6 janvier 1978", "Conditions Générales de Ventes"]
		},
		{
			"weight": 10,
			"addWeight": {
				"SEEN" : 1
			},
			"flags": [
				"UNDRAFT", "UNDELETED"
			],
			"keywords": ["Informatique et Libertes", "L121-21", "Informatique et Libertés"]
		}
	]
	
	if (!Array.isArray(search_terms))
		throw new Error('Expected array for search criteria');
	criteria = 	[
								['OR',
									[
										['OR',
											'SEEN',
											'ANSWERED'
										],
										'UNDRAFT', 'UNDELETED',
										['OR',
											['TEXT', '6 janvier 1978'],
											['TEXT', 'Conditions Générales de Ventes']
										]
									],
									[
										'SEEN',
										'UNDRAFT', 'UNDELETED',
										['OR',
											['TEXT', 'Informatique et Libertés'],
											['TEXT', 'L121-21']
										]
									]
								]
							]
	search_terms.forEach((ele, idx) => {
		var criteria = [], keywordsCriteria = [],
				keywords = ele.keywords, flags = ele.flags,
				weight = ele.weight, criteria_w = {};

		if (keywords.length > 0) {
			keywordsCriteria = keywords.map(key => ['TEXT'].concat(key));
		}
		if (keywords.length > 1) {
			mkKeywordsCriteria(keywordsCriteria);
			criteria = criteria.concat(keywordsCriteria);
		}
		if (flags.length > 0) {
			criteria = criteria.concat(flags);
		}

		criteria_w = {criteria, weight}
		console.log(`criteria-${++idx} :`, JSON.stringify(criteria_w));

		criterias.push(criteria_w);
	});

	function mkKeywordsCriteria(keywords) {
		var firstItm = ['OR'];
		if (keywords.length > 1) {
			firstItm = firstItm.concat(keywords.slice(0, 2))
		}
		keywords.shift();
		keywords[0] = firstItm;
		if (keywords.length > 1) {
			mkKeywordsCriteria(keywords);
		}
	}
/*
	var arr1 = [10,11,12,13,14,15]
	var arr2 = [7,8,9,10,11,12]
	var arr3 = [...new Set([...arr1, ...arr2])];
	var scoreArr = arr3.map(itm => {
		var newItm = 0;
		if (arr1.indexOf(itm) >= 0) newItm += 25
		if (arr2.indexOf(itm) >= 0) newItm += 15
		return newItm
	})
	var scoreObj = {}
	arr3.forEach((key, index) => {
		scoreObj[key] = scoreArr[index];
	});
		
	console.log('array3', arr3);
	console.log('scoreArr', scoreArr);
	console.log('scoreObj', scoreObj);
*/
	imap.connect();
})();