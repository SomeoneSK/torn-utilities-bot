const {Database} = require("../database.js")
const {Discord_functions} = require('../helper_functions/discord.js')
const {General_functions} = require('../helper_functions/general.js')

async function get_shared_api_key() {
	data = Database.getData()

	if (data["general"]["shared_apis"]["apis"].length === 0) {
		return ""
	}
	data["general"]["shared_apis"]["index"] += 1
	if ( data["general"]["shared_apis"]["index"] > data["general"]["shared_apis"]["apis"].length -1 ) {
		data["general"]["shared_apis"]["index"] = 0
	}
	await Database.setData(data, {})
	let discord_id = data["general"]["shared_apis"]["apis"][ data["general"]["shared_apis"]["index"] ]["discord_id"]
	return data["players"][ discord_id.toString() ]["torn_api_key"]
}

function get_users_key(user_id=false) {
	doc = General_functions.get_user( user_id=user_id )
	if ( doc !== undefined ) {
		return doc["torn_api_key"]
	}
	return ""
}

async function get_data_from_api_shared(url) {
	let data = Database.getData()
	let key = await get_shared_api_key()
	let start_index = data["general"]["shared_apis"]["index"]
	let index_used = data["general"]["shared_apis"]["index"]
	while (true) {
		let result = await General_functions.http_request(url + key)
		if ( result["error"] !== undefined ) {
			if ( ![2, 5, 10, 11, 12, 13, 14].includes(result["error"]["code"]) ) {
				return result
			}

			data = Database.getData()
			key = await get_shared_api_key()
			if (key === "") {
				return {"error":"No shared API keys!"}
			}
			let index = data["general"]["shared_apis"]["index"]
			if ( [2, 10].includes(result["error"]["code"]) ) {
				await share_users_key(data["general"]["shared_apis"]["apis"][index_used]["discord_id"], share=false)
			}
			if (index === start_index) {
				return {"error":"All shared APIs failed!"}
			}
			index_used = index
			continue
		}
		return result
	}
	return res
}

async function get_data_from_api( url, user_id=false, private=false ) {
	key = get_users_key( user_id=user_id.toString() )
	if ( key !== "" ) {
		res = await General_functions.http_request(url + key)
		return res
	}
	if ( private === false ) {
		return await get_data_from_api_shared(url)
	}
	return { "error": "You did not set your api!"}
};

async function set_users_key(user_id, guild_id, key="") {
	let filter = {"discord_id": user_id.toString() }
	let update = {"$set": {"torn_api_key":key } }
	if ( key === "") {
		update["$set"]["share_api_key"] = false
	}
	let operation1 = {"updateOne": { filter: filter, update: update } }

	data = Database.getData()
	data["players"][ user_id.toString() ]["torn_api_key"] = key
	a = await Database.setData( data, {"players": [ operation1 ] } )

	if (key !== "") {
		let url = General_functions.make_url( "user", id=id, selections=["profile"] )
		info = await get_data_from_api( url, user_id, private=false )
		if ( info["error"] !== undefined ) {
			let error = info["error"]["error"] || info["error"]
			return {"error": "Set your API key but did not rename you - " + error }
		}
		let result = await Discord_functions.rename_user( user_id, guild_id, info["name"] + "[ " + info["player_id"] + "]" )
		if ( result["error"] !== undefined ) {
			return {"error": "Set your API key, but could not rename you."}
		}
	}
	return {"done":true}
}

async function set_users_id(user_id, guild_id, id="") {
	data = Database.getData()
	if ( data["players"][ user_id.toString() ]["torn_api_key"] !== "" ) {
		return {"error": "Can't set your ID when you have set API key!"}
	}

	if (id !== "") {
		let url = General_functions.make_url( "user", id=id, selections=["profile"] )
		info = await get_data_from_api( url, user_id, private=false )
		if ( info["error"] !== undefined ) {
			let error = info["error"]["error"] || info["error"]
			return {"error": error + " - can't get your name!" }
		}
	}

	let filter = {"discord_id": user_id.toString() }
	let update = {"$set": {"torn_id":id } }

	let operation1 = {"updateOne": { filter: filter, update: update } }

	data["players"][ user_id.toString() ]["torn_id"] = id
	a = await Database.setData( data, {"players": [ operation1 ] } )

	let result = await Discord_functions.rename_user( user_id, guild_id, info["name"] + "[ " + info["player_id"] + "]" )
	if ( result["error"] !== undefined ) {
		return {"error": "Set your ID, but could not rename you."}
	}

	return {"done":true}

}

async function share_users_key(user_id, share=false) {
	data = Database.getData()
	let this_player = data["players"][user_id.toString()]

	if (this_player["torn_api_key"] === "") {
		return "You have not set your API key or it was removed!"
	}
	if ( share === "!" ) {
		share = !this_player["share_api_key"]
	}

	let filter = {"discord_id": user_id }
	let update = {"$set": {"share_api_key":share } }
	let operation1 = {"updateOne": { filter: filter, update: update } }
	
	this_player["share_api_key"] = share

	let filter2 = {"general": true }
	let update2 = {}
	if ( share === true) {
		let the_info = {"discord_id": user_id.toString(), "torn_id": this_player["torn_id"] }

		update2 = {"$push": {"shared_apis" : the_info } }
		data["general"]["shared_apis"]["apis"].push( the_info )
	} else {
		update2 = {"$pull": {"shared_apis" : {"torn_id": this_player["torn_id"] } } }

		for( var i = 0; i < data["general"]["shared_apis"]["apis"].length; i++){ 
			if ( data["general"]["shared_apis"]["apis"][i]["torn_id"] === this_player["torn_id"]) { 
		
				data["general"]["shared_apis"]["apis"].splice(i, 1); 
			}
		}
	}

	let operation2 = {"updateOne": { filter: filter2, update: update2 } }

	data = await Database.setData( data, {"players": [ operation1 ], "general": [operation2] } )

	if ( share === true ) {
		return "Your API key is now shared (only for public info)!"
	}
	return "Your API key is now no longer shared!"
}

let Id_api_functions = {
	set_users_key: set_users_key,
	share_users_key: share_users_key,
	set_users_id: set_users_id,
	get_shared_api_key: get_shared_api_key,
	get_users_key: get_users_key,
	get_data_from_api_shared: get_data_from_api_shared
}

exports.Id_api_functions = Id_api_functions;