// ==MiruExtension==
// @name         MyIPTV
// @description  A simple IPTV client
// @version      v0.0.4
// @author       vvsolo
// @lang         all
// @license      MIT
// @package      client.iptv
// @type         bangumi
// @icon         https://avatars.githubusercontent.com/u/55937028?s=48&v=4
// @webSite      https://
// @nsfw         false
// ==/MiruExtension==

export default class extends Extension {
	#mySource = 'https://github.moeyy.xyz/https://raw.githubusercontent.com/vvsolo/miru-extension-MyIPTV-sources/main/sources.json';
	#opts = {
		url: 'https://live.fanmingming.com/tv/m3u/ipv6.m3u',
		options: {
			'none': '',
			'fanmingming-IPV6': 'https://live.fanmingming.com/tv/m3u/ipv6.m3u',
			'fanmingming-IPV4': 'https://live.fanmingming.com/tv/m3u/v6.m3u',
			'MyIPTV-IPV6': 'https://qu.ax/nazV.m3u',
			'MyIPTV-IPV4': 'https://qu.ax/atTi.m3u',
			'YueChan-IPV6': 'https://github.moeyy.xyz/https://raw.githubusercontent.com/YueChan/Live/main/IPTV.m3u',
			'YueChan-Radio': 'https://github.moeyy.xyz/https://raw.githubusercontent.com/YueChan/Live/main/Radio.m3u',
			'YanG-1989-Gather': 'https://github.moeyy.xyz/https://raw.githubusercontent.com/YanG-1989/m3u/main/Gather.m3u',
			'BESTV': 'https://github.moeyy.xyz/https://raw.githubusercontent.com/Ftindy/IPTV-URL/main/bestv.m3u',
			'test-type-txt': 'https://myernestlu.github.io/zby.txt',
			//'[NSFW]Adult-IPTV': 'http://adultiptv.net/chs.m3u',
			//'[NSFW]Adult-IPTV-Vod': 'http://adultiptv.net/videos.m3u8',
			//'[NSFW]YanG-1989-Adult': 'https://github.moeyy.xyz/https://raw.githubusercontent.com/YanG-1989/m3u/main/Adult.m3u',
			//'[NSFW]蜂蜜18+': 'https://github.moeyy.xyz/https://raw.githubusercontent.com/FongMi/CatVodSpider/main/txt/adult.txt',
			//'MV系列': 'https://qu.ax/oiNH.txt',
		}
	}
	#cache = {
		items: [],
		groups: {"All": "All"},
		uptime: 0
	}

	cacheDefaultGroups() {
		this.#cache.groups = {"All": "All"};
	}
	async load() {
		const opts = this.#opts.options;
		const res = await this.req(this.#mySource);
		if (res) {
			try {
				Object.assign(opts, JSON.parse(res));
			} catch(e) {}
		}
		
		this.#cache.uptime = 0;
		await this.registerSetting({
			title: 'Built-in Source',
			key: 'builtin',
			type: 'radio',
			description: 'Choose the custom source below when you choose "None"',
			defaultValue: '',
			options: opts
		});
		await this.registerSetting({
			title: 'Custom Source',
			key: 'source',
			type: 'input',
			description: 'IPTV source address (.m3u;.m3u8;.txt)',
			defaultValue: this.#opts.url
		});
		await this.registerSetting({
			title: 'Cache Expire Time',
			key: 'expire',
			type: 'radio',
			description: 'Set `none` is no cache\nTips: After changing the source address, the delay will be refreshed',
			defaultValue: '0',
			options: {
				'none': '0',
				'5 minute': '5',
				'15 minute': '15',
				'30 minute': '30',
				'1 hour': '60',
				'3 hour': '180',
				'6 hour': '360',
				'12 hour': '720',
				'24 hour': '1440',
			}
		});
	}
	async createFilter(filter) {
		return {
			"data": {
				title: "",
				max: 1,
				min: 1,
				default: "All",
				options: this.#cache.groups,
			}
		}
	}
	async req(path) {
		const res = await fetch(path, {
			method: 'GET',
			headers: {
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36",
				'Miru-Url': path
			}
		});
		if (res.ok) {
			return await res.text();
		}
	}

	async latest(page) {
		if (page > 1) {
			return [];
		}
		const expire = +(await this.getSetting('expire'));
		if (
			expire > 0 &&
			~this.#cache.items.length &&
			(Date.now() - this.#cache.uptime) < expire*60*1000
		) {
			return this.#cache.items;
		}
		const builtin = await this.getSetting('builtin');
		const baseUrl = builtin ? builtin : await this.getSetting('source');
		if (!baseUrl) {
			throw 'No valid address set!';
		}
		const ext = baseUrl.slice(baseUrl.lastIndexOf('.')).toLowerCase();
		let res = await this.req(baseUrl);
		res = res
			.replace(/\r?\n/g, '\n')
			.replace(/\n+/g, '\n')
			.trim();

		const setCover = (v) => v && `https://epg.112114.xyz/logo/${v}.png` || null;
		const content = res.split('\n');
		const bangumi = [];
		if (ext === '.m3u' || ~res.search(/#EXT(?:M3U|INF)/i)) {
			let title, cover, group;
			let headers = {};
			const vlcopt = {
				'User-Agent': '#EXTVLCOPT:http-user-agent=',
				'Referer': '#EXTVLCOPT:http-referrer=',
			}
			content.forEach((item) => {
				if (item.startsWith('#EXTINF:')) {
					title = item.slice(item.lastIndexOf(',') + 1).trim();
					group = item.match(/group\-title\="([^"]+)"/)?.[1] || '';
					cover = item.match(/tvg\-logo\="([^"]+)"/)?.[1] || null;
				} else if (item.startsWith('#EXTVLCOPT:')) {
					for (let v in vlcopt) if (item.startsWith(vlcopt[v])) {
						headers[v] = item.slice(vlcopt[v].length);
					}
				} else if (title && ~item.search(/^(?:https?|rs[tcm]p|rsp|mms)/) && !~item.search(/\.mpd/)) {
					bangumi.push({
						title,
						url: item.trim(),
						cover,
						group,
						headers,
					});
					title = '';
					headers = {};
				}
			});
		} else if (ext === '.txt' || ~res.search(/#genre#/i)) {
			let group, tmp;
			content.forEach((item) => {
				tmp = item.split(',');
				if (tmp.length !== 2) {
					return;
				}
				const [title, url] = tmp;
				if (url === '#genre#') {
					group = title;
					return;
				}
				let cover = setCover(title.trim().replace(/ *[\[\(（].+$/m, ''));
				bangumi.push({
					title,
					url,
					cover,
					group
				});
			});
		}
		// multiple groups
		this.cacheDefaultGroups();
		~bangumi.length && bangumi.forEach(v => {
			v.group && v.group.split(';').map(x => {
				this.#cache.groups[x] = x;
			})
		})
		this.#cache.uptime = Date.now();

		return (this.#cache.items = bangumi);
	}

	async search(kw, page, filter) {
		if (page > 1) {
			return [];
		}
		!~this.#cache.items.length && await this.latest();
		const filt = filter?.data && filter.data[0] || 'All';
		const bangumi = this.#cache.items;
		if (filt === 'All') {
			return !kw ? bangumi : bangumi.filter(v => ~v.title.indexOf(kw));
		}
		return bangumi.filter(v => (v.group && ~`;${v.group};`.indexOf(`;${filt};`)) && (kw ? ~v.title.indexOf(kw) : true));
	}

	async detail(url) {
		const bangumi = this.#cache.items.find((v) => v.url === url);
		const parseUrls = (item) => {
			const urls = item.url.split('#');
			const l = urls.length;
			return urls.map((v, i) => {
				return {
					name: l > 1 ? `${item.title} [${i + 1}]` : `${item.title}`,
					url: v
				};
			})
		};
		bangumi.episodes = [
			{
				title: bangumi.title,
				urls: parseUrls(bangumi)
			}
		];
		// multiple groups
		let groups;
		bangumi.group && bangumi.group.split(';').forEach(g => {
			groups = this.#cache.items
				.filter((v) => (v.group && ~`;${v.group};`.indexOf(`;${g};`)))
				.map((v) => parseUrls(v)) || [];

			~groups.length && bangumi.episodes.push({
				title: `[${g}]`,
				urls: groups.flat()
			})
		})
		return bangumi;
	}

	async watch(url) {
		const bangumi = this.#cache.items.find((v) => v.url === url || ~v.url.indexOf(url));
		const item = {
			type: 'hls',
			url
		}
		if (('headers' in bangumi) && ~Object.keys(bangumi.headers).length) {
			item['headers'] = bangumi.headers
		}
		return item;
	}
}