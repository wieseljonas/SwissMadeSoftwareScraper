var Promise = require("bluebird");
var request = require("request");
var cheerio = require('cheerio');
var json2xls = require('json2xls');
var fs = require('fs');
Promise.promisifyAll(request)


getUrls()



function getUrls(){
	var promises = [];
	var pageUrls = [];
	var urls = [];
	for (var i = 1; i < 39; i++) {
		pageUrls.push('http://startupticker.ch/en/topics?category=Financing&page=' + i)
	}
	Promise.map(pageUrls, pageUrl => new Promise((resolve, reject) => {
	    console.log('Visiting Page ' + pageUrl);
	    request(pageUrl, function (error, response, html) {
		  	if (!error && response.statusCode == 200) {
		    	var $ = cheerio.load(html,{
					ignoreWhitespace: true
				});

		    	$('div.topic').each(function(i, element){
		    		var url = 'http://startupticker.ch' + $(this).children('div.article').children('h2').children('a').attr('href')
		      		urls.push(url)
		   	 	});
		   	 	resolve();
			}
		});
	}), {
	    concurrency: 4
	}).then(() => {
	    parsePages(urls)
	    console.log('All Urls Created!');
	}).catch(err => {
	    console.error('Failed: ' + err.message);
	});
}


function parsePages(urls) {
	var parsedPages = [];
	Promise.map(urls, url => new Promise((resolve, reject) => {
	    console.log('Visiting page ' + url);
	    request(url, function (error, response, html) {
		  	if (!error && response.statusCode == 200) {
		    	var $ = cheerio.load(html,{
						    ignoreWhitespace: true
						});
				var title = $('div.article h2').text()
				var date = $('span.list_date').text().slice(0,10)
				var content = $('div.content').text()
				var intro = $('div.intro').text()
				var companyUrl = 'http://startupticker.ch' + $('div.company a').attr('href')
				var logoUrl = $('div.company a img').attr('src')

				var article = {
					date: date,
					logoUrl: logoUrl,
					companyUrl: companyUrl,
					title: title,
					url: url,
					intro: intro,
					content: content,
				};
				request(article.companyUrl, function (error, response, html) {
				  	if (!error && response.statusCode == 200) {
				    	var $ = cheerio.load(html,{
								    ignoreWhitespace: true
								});
						var companyName = $('div.cms-page h2').first().text()
						var details = $('div.inline div')
						var canton = details.first().text().replace('Canton:','');
						var foundation = details.last().text().replace('Founded:','');

						article["companyName"] = companyName
						article["canton"] = canton
						article["foundation"] = foundation
						parsedPages.push(article)
				   	 	resolve();
					}
					resolve()
				});
			}
		})
	}), {
	    concurrency: 4
	}).then(() => {
	    console.log(parsedPages);
	    console.log('All Pages parsed Created!');

		var xls = json2xls(parsedPages);

		fs.writeFileSync('data.xlsx', xls, 'binary');
	}).catch(err => {
	    console.error('Failed: ' + err.message);
	});
}