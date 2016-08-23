var Promise = require("bluebird");
var sslRootCAs = require('ssl-root-cas/latest')
sslRootCAs.inject()
var request = require("request");
var cheerio = require('cheerio');
var json2xls = require('json2xls');
var fs = require('fs');
Promise.promisifyAll(request)


getUrls()



function getUrls(){
	 var characters = ["1","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"]
	var pageUrls = [];
	var urls = [];
	for (c of characters) {
		pageUrls.push('https://www.swissmadesoftware.org/en/home/companies~'+ c +'~.html');
	}
	Promise.map(pageUrls, pageUrl => new Promise((resolve, reject) => {
	    console.log('Visiting Page ' + pageUrl);
	    request({"rejectUnauthorized": false,
		    "url": pageUrl,
		    "method": "GET"
		    }, function (error, response, html) {
		  	if (!error && response.statusCode == 200) {
		    	var $ = cheerio.load(html,{
					ignoreWhitespace: true
				});
		    	$('ul.company-list li').each(function(i, element){
		    		var url = 'https://www.swissmadesoftware.org' + $(this).children('li a').attr('href')
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
	var parsedCompany = [];
	Promise.map(urls, url => new Promise((resolve, reject) => {
	    console.log('Visiting page ' + url);
	    request({"rejectUnauthorized": false,
		    "url": url,
		    "method": "GET"
		    }, function (error, response, html) {
		  	if (!error && response.statusCode == 200) {
		    	var $ = cheerio.load(html,{
						    ignoreWhitespace: false
						});
		    	
				var companyName = $('h1.effect-title').text()
				var companyUrl = $('figure.image a').attr('href')
				var description = $('div.text div.cell-large-left p').first().text().replace(/\s+/g, ' ')
				var contacts = $('div.text div.cell-large-left p').eq(1).text().replace(/\s+/g, ' ')
				var address = $('div.text div.cell-large-left p').eq(2).text().replace(/\s+/g, ' ').split(" ").filter(function (e) { return  e != ''})
				var other = $('div.text div.cell-large-left p').last().text().split("\n")
				var logoUrl = 'https://www.swissmadesoftware.org' +$('figure.image a img').attr('src')
				var company = {
					companyName: companyName,
					companyUrl: companyUrl,
					description: description,
					contacts: contacts,
					email: other.filter(function (e) { return  e.indexOf("@") !== -1}).join(";").replace(/\s+/g, ' '),
					telephone: other.filter(function (e) { return  e.indexOf("Tel") !== -1}).join(";").replace(/\s+/g, ' '),
					fax: other.filter(function (e) { return  e.indexOf("Fax") !== -1}).join(";").replace(/\s+/g, ' '),
					street: address.splice(0, address.length -3).join(" "),
					postCode: address[address.length -3],
					canton: address[address.length -2],
					country: address[address.length -1],
					logoUrl: logoUrl,					
				};
				parsedCompany.push(company)
				resolve()
			}
		})
	}), {
	    concurrency: 4
	}).then(() => {
	    console.log('All Pages parsed Created!');

		var xls = json2xls(parsedCompany);

		fs.writeFileSync('data.xlsx', xls, 'binary');
	}).catch(err => {
	    console.error('Failed: ' + err.message);
	});
}