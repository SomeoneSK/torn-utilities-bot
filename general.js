const axios = require('axios');
const global_data = require('./global_data.js')
const id_api_stuff = require('./helper_functions/id_api_stuff.js')
const torn = require('./torn')


function get_user( user_id=false ) {
	data = global_data.getData()
	if ( Object.keys( data["players"] ).includes( user_id.toString() )  ) {
		return data["players"][ user_id.toString() ]
	}
	return undefined
}

async function get_shared_api_key() {
	data = global_data.getData()
	data["general"]["shared_apis"]["index"] += 1
	if ( data["general"]["shared_apis"]["index"] > data["general"]["shared_apis"]["apis"].length -1 ) {
		data["general"]["shared_apis"]["index"] = 0
	}
	await global_data.setData(data, {})
	let discord_id =  data["general"]["shared_apis"]["apis"][ data["general"]["shared_apis"]["index"] ]["discord_id"]
	return data["players"][ discord_id.toString() ]["torn_api_key"]
}

function get_users_key(user_id=false) {
	doc = get_user( user_id=user_id )
	if ( doc !== undefined ) {
		return doc["torn_api_key"]
	}
	return ""
}

async function http_request(url) {
	console.log(url)
	try {
		const response = await axios.get(url);
		return response.data
	} catch (error) {
    	console.log(error.config);
		return {"error":"Error while making http request!"}
	}
}

async function get_data_from_api_shared(url) {
	let data = global_data.getData()
	let key = await get_shared_api_key()
	let start_index = data["general"]["shared_apis"]["index"]
	let index_used = data["general"]["shared_apis"]["index"]
	while (true) {
		let result = await http_request(url + key)
		if ( result["error"] !== undefined ) {
			if ( ![2, 5, 10, 11, 12, 13, 14].includes(result["error"]["code"]) ) {
				return result
			}

			data = global_data.getData()
			key = await get_shared_api_key()
			let index = data["general"]["shared_apis"]["index"]

			if ( [2, 10].includes(result["error"]["code"]) ) {
				await id_api_stuff.share_users_key(data["general"]["shared_apis"]["apis"][index_used]["discord_id"], share=false)
			}
			if(index === start_index) {
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
	key = get_users_key( user_id=user_id )
	if ( key !== "" ) {
		res = await http_request(url + key)
		return res
	}

	if ( private === false ) {
		return await get_data_from_api_shared(url)
	}

	return { "error": "You did not set your api!"}
};

function make_url( category, id="", selections=[], key="" ) {
	let selection = ""
	for (let sel of selections) {
		selection += "," + sel
	}
	selection = selection.slice(1)
	return "https://api.torn.com/" + category + "/" + id + "?selections=" + selection + "&key=" + key
}

function make_link(which, id="", format=false) {
	let link = ''
	if (which === "player_profile") {
		link = "https://www.torn.com/profiles.php?XID=" + id
	} else if (which === "faction_profile") {
		link = "https://www.torn.com/factions.php?step=profile&ID=" + id
	} else if (which === "company_profile") {
		link = "https://www.torn.com/companies.php?step=profile&ID=" + id
	} else if (which === "attack") {
		link = "https://www.torn.com/loader2.php?sid=getInAttack&user2ID=" + id
	} else if (which === "message") {
		link = "https://www.torn.com/messages.php#/p=compose&XID=" + id
	} else if (which === "send_money") {
		link = "https://www.torn.com/sendcash.php#/XID=" + id
	} else if (which === "trade") {
		link = "https://www.torn.com/trade.php#step=start&userID=" + id
	} else if (which === "place_bounty") {
		link =	"https://www.torn.com/bounties.php?p=add&XID=" + id
	} else if (which === "add_friend") {
		link = "https://www.torn.com/friendlist.php#/p=add&XID=" + id
	} else if (which === "add_enemy") {
		link = "https://www.torn.com/blacklist.php#/p=add&XID=" + id
	} else if (which === "personal_stats") {
		link = "https://www.torn.com/personalstats.php?ID=" + id
	} else if (which === "player_bazaar") {
		link = "https://www.torn.com/bazaar.php?userId=" + id
	} else if (which === "place_bounty") {
		link = "https://www.torn.com/bounties.php?p=add&XID=" + id
	} else if (which === "display_case") {
		link = "https://www.torn.com/displaycase.php#display/" + id
	} else if (which === "item_market") {
		link = "https://www.torn.com/imarket.php#/p=shop&step=shop&type=&searchname=" + id.replace(" ", "+")
	}

	if (format !== false) {
		return '[' + format + '](' + link + ')'
	}
	return link
}

function isInt(value) {
  return !isNaN(value) && 
         parseInt(Number(value)) == value && 
         !isNaN(parseInt(value, 10));
}

function format_number(number) {
	if ( !isInt(number) ) {number = number.toString() }
	return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function make_random_str(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * 
 charactersLength));
   }
   return result;
}

function copy(obj) {
    if (null == obj || "object" != typeof obj) return obj;
    var copy = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
    }
    return copy;
}

let emojis = {} 
async function set_emojis(new_emojis){
	emojis = new_emojis
}

function get_emoji(name){
	return emojis[name]
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function add_stock_options(option) {
	for (let acronym of Object.keys(torn.stocks)) {
		option.addChoice(torn.stocks[acronym].name + " - " + acronym, acronym)
	}
	return option
}

function delete_from_list_by_key(list, key, value) {
	let new_list = list.filter(x => {
		return x[key] != value;
	})
	return new_list
}

let client = undefined
function getCient() {
  return client;
};
async function makeClient(new_client){
	client = new_client
}
exports.getCient = getCient;
exports.makeClient = makeClient;

async function mention_user(id) {
	let to_mention = await client.users.fetch( id )
	if ( to_mention === undefined) {
		return undefined
	}
	let mention = to_mention.toString()
	return mention
}
exports.mention_user = mention_user;

async function get_channel(id) {
	return await client.channels.cache.get(id)
}
exports.get_channel = get_channel;

exports.http_request = http_request;
exports.get_data_from_api = get_data_from_api;
exports.get_data_from_api_shared = get_data_from_api_shared;
exports.make_url = make_url;
exports.make_link = make_link;
exports.format_number = format_number;
exports.get_users_key = get_users_key;
exports.make_random_str = make_random_str;
exports.copy = copy;
exports.set_emojis = set_emojis;
exports.get_emoji = get_emoji;
exports.sleep = sleep;
exports.add_stock_options = add_stock_options;
exports.delete_from_list_by_key = delete_from_list_by_key;