var http = require('http');
var fs = require('fs');
var path = require('path');
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true })); 
app.use(bodyParser.json({ type: 'application/*+json' })); 
var Rooms = [];
var usernames = [];//{}for json data, but we use [] because of the way we store the data
var UniqueCode = true;
var ValidCode = false;
var genCode;
var NumberOfGuests = 0;

io.on('connection', function (socket) {

socket.on("Create Session", function(Data){
		genRand();
		var Name = Data.hostName;
		socket.username = Name;
		socket.room = genCode;
		NumberOfGuests++;
		usernames.push({userName: Name, code:genCode, rank:"Host", List:[]});
		Rooms.push(genCode);
		socket.join(genCode);
		socket.emit('recieve code', {
			Code: genCode
		});
		console.log("New Session Created");
		console.log(usernames);
		console.log(NumberOfGuests + " <--- Inside the Create Session");
	});
	
socket.on("join session", function(Code){//Implement a if/else that prevents people from joining if the session is already in session
		ValidCode = false;
		var GivenName = Code.dataName;
		var GivenCode = Code.dataCode;
		var GroupList = [];
		console.log(usernames);
		console.log(Rooms);
		NumberOfGuests++;
		for(i=0;i<Rooms.length;i++)
		{
			if(GivenCode == Rooms[i])
			{
				ValidCode = true;
				socket.room = Rooms[i];
				socket.username = GivenName;
				usernames.push({userName:GivenName, code:GivenCode, rank:"User", NSA:"Not on list"});
				socket.join(Rooms[i]);
					for(j=0;j<NumberOfGuests;j++)
					{
						if(usernames[j]['code'] == GivenCode)//This might be unessacary
						{
							if(usernames[j]['rank'] != "Host")
							{
								GroupList.push(usernames[j]['userName']);
							}
						}
					}
				socket.emit('user recieve code', {
					Code: GivenCode
				});//returns back to the caller
				io.sockets.emit('displayName', {
					Code:GivenCode,
					List:GroupList
				});//returns to everyone

			}
		}
		console.log(usernames);
		if(ValidCode == false)
		{
			socket.emit('Bad Code', {
				result:false
			});			
		}		
	});

socket.on("Start Session", function(Data){
	var GivenCode = Data.code;
	io.sockets.emit('start session', {
					Code:GivenCode
				});
});

socket.on("Add name to list", function(Data){
	var userName = Data.userName;
	var userCode = Data.userCode;
	var List = [];
	for(i=0;i<Rooms.length;i++)
		{
			if(userCode == Rooms[i])
			{
				for(j=0;j<NumberOfGuests;j++)
				{
					if(usernames[j]['userName'] == userName)
					{
						if(usernames[j]['NSA'] == "Not on list")//Don't think this if statement is needed
						{
							usernames[j]['NSA'] = "On a list";
							List.push(usernames[j]['userName']);
						}
					}
				}
			}
		}
	for(x=0;x<NumberOfGuests;x++)
	{
		if(usernames[x]['rank'] == "Host")
		{
			if(usernames[x]['code'] == userCode)
			{
			usernames[x]['List'].push(List);
			List = usernames[x]['List'];
			}
		}
	}
	
	socket.emit('Added Name', {
		Code:Data.userCode
	});
	io.sockets.emit('Add Name', {
		Code:userCode,
		List:List
	});
});

socket.on("Take name off list", function(Data){
	var userName = Data.userName;
	var userCode = Data.userCode;
	var List = [];
	for(i=0;i<Rooms.length;i++)
		{
			if(userCode == Rooms[i])
			{
				for(j=0;j<NumberOfGuests;j++)
				{
					if(usernames[j]['userName'] == userName)
					{
						if(usernames[j]['NSA'] == "On a list")//Don't think this if statement is needed
						{
							usernames[j]['NSA'] = "Not on list";
						}
					}
				}
			}
		}
	for(x=0;x<NumberOfGuests;x++)
	{
		if(usernames[x]['rank'] == "Host")
		{
			if(usernames[x]['code'] == userCode)
			{
				console.log(userName);
				console.log(usernames[x]['List']);
				List = usernames[x]['List'];
				var Position = List.indexOf(userName);
				console.log(Position);
				usernames[x]['List'].splice(Position,1);
				List = usernames[x]['List'];
				console.log(List);
			}
		}
	}
	
	socket.emit('TookNameOff', {
		Code:Data.code
	});
	
	io.sockets.emit('Add Name', {
		Code:userCode,
		List:List
	});
});

socket.on("End Session", function(Data){
	io.sockets.emit('end of session', {
		Code:Data.code
	});
});

socket.on('disconnect', function(data){
	console.log("Below is the person that disconnected")
	console.log(socket.username)
	for(i=0;i<usernames.length;i++)
	{
		if(usernames[i]['userName'] == socket.username)
		{
			if(usernames[i]['rank'] == 'User')
			{
				NumberOfGuests--;
			}else if(usernames[i]['rank'] == 'Host')
			{
				for(j=0;j<Rooms.length;j++)
				{
					if(Rooms[j] == usernames[i]['code'])
					{
					io.sockets.emit('end of session',{
						Code:usernames[i]['code']
					})
					Rooms.splice(j,1);
					NumberOfGuests--;
					}
				}
			}
			usernames.splice(i,1);
		}
	}
	socket.leave(socket.room);
	console.log("Below is the Username Array after Disconnect");
	console.log(usernames);
	console.log(Rooms);
	console.log(NumberOfGuests + " <---- Number of Guests in Disconnect");
	});
});

function genRand()	{
	genCode = Math.floor(Math.random() * 100000);
	var HostNumber = 0;
		for(i=0;i<usernames.length;i++)
		{
			if(usernames[i]['rank'] == 'Host')
			{
				HostNumber++;
			}
		}

		for(i=0;i<HostNumber;i++)
		{
			if(usernames[i]['rank'] == 'Host')
			{
				if(usernames[i]['code'] == genCode)
				{
				UniqueCode = false;
				break;
				}
			}
		}
		if(UniqueCode == false)
		{
			UniqueCode = true;
			genRand();
		}
}		

function send404Response(response){
	response.writeHead(404, {"Content-Type": "text/plain"});
	response.write("Error 404: Page not found!");
	response.end();
};

app.use(express.static(__dirname + '/public'));

server.listen(process.env.PORT || 3000, function () {
  console.log('Server listening at port %d 3000');
});