document.addEventListener('DOMContentLoaded', () => {
	const gamertag_loader = document.getElementById('gamertag-loader');
	const settings_toggle = document.getElementById('settings-toggle');
	const settings_panel = document.getElementById('settings-panel');
	const settings_form = document.getElementById('settings-form');
	const proxy_url_input = document.getElementById('proxy-url-input');
	const api_key_input = document.getElementById('api-key-input');
	const settings_status = document.getElementById('settings-status');

	const reload_btn = document.getElementById('reload-btn');
	const view_btn = document.getElementById('view-btn');

	const save_btn = document.getElementById('save-btn');

	const gamertag_input = document.getElementById('gamertag-input');
	const games_section = document.getElementById('games-section');
	const games_container = document.getElementById('games-container');

	const error_box = document.getElementById('error-box');
	const error_text = document.getElementById('error-text');

	let full_data = null;
	let games_data = null;
	let current_gamertag = '';
	let current_xuid = '';
	let is_grid_view = false;
	let settings_status_timeout;

	const xuid_cache = {};

	let proxy_url = localStorage.getItem('proxy_url') || '';
	let api_key = localStorage.getItem('api_key') || '';
	proxy_url_input.value = proxy_url;
	api_key_input.value = api_key;

	const fetch_xbl_json = async (api_endpoint) => {
		const response = await fetch(proxy_url + '/?url=' + encodeURIComponent(api_endpoint), {
			headers: {
				'accept': '*/*',
				'x-authorization': api_key
			}
		});

		if (!response.ok) {
			throw new Error('Network response was not OK');
		}

		return await response.json();
	};

	settings_toggle.addEventListener('click', () => {
		const is_open = !settings_panel.classList.contains('d-none');
		settings_panel.classList.toggle('d-none', is_open);
		settings_toggle.setAttribute('aria-expanded', String(!is_open));
	});

	settings_form.addEventListener('submit', (event) => {
		event.preventDefault();
		proxy_url = proxy_url_input.value.trim();
		api_key = api_key_input.value.trim();

		if (!proxy_url || !api_key) {
			return;
		}

		localStorage.setItem('proxy_url', proxy_url);
		localStorage.setItem('api_key', api_key);
		proxy_url_input.value = proxy_url;
		settings_status.textContent = 'Saved';
		clearTimeout(settings_status_timeout);
		settings_status_timeout = setTimeout(() => {
			settings_status.textContent = '';
		}, 3000);
	});

	const get_xuid_from_gamertag = async (gamertag) => {
		const cache_key = gamertag.toLowerCase();

		if (xuid_cache[cache_key]) {
			return xuid_cache[cache_key];
		}

		const api_endpoint = 'https://api.xbl.io/v2/search/' + encodeURIComponent(gamertag);
		const data = await fetch_xbl_json(api_endpoint);

		const people = data && data.content && Array.isArray(data.content.people)
			? data.content.people
			: [];

		if (!people.length) {
			throw new Error('No player found for that gamertag');
		}

		const exact_match = people.find((person) => {
			return person.gamertag && person.gamertag.toLowerCase() === gamertag.toLowerCase();
		});

		const player = exact_match || people[0];

		if (!player.xuid) {
			throw new Error('Player found, but XUID is missing');
		}

		xuid_cache[cache_key] = player.xuid;

		return player.xuid;
	};

	const fetch_games_by_xuid = async (xuid) => {
		const api_endpoint = 'https://api.xbl.io/v2/achievements/player/' + encodeURIComponent(xuid);
		const data = (await fetch_xbl_json(api_endpoint)).content;

		if (!data.titles || !Array.isArray(data.titles)) {
			throw new Error('Invalid JSON structure');
		}

		full_data = data;
		games_data = data.titles;

		render_games(games_data);
		update_container_classes();
	};

	const show_loading = () => {
		error_box.classList.add('d-none');
		games_container.innerHTML = '';
		games_section.classList.remove('d-none');

		const spinner = document.createElement('div');
		spinner.id = 'loading-spinner';
		spinner.className = 'd-flex justify-content-center w-100 my-3';
		spinner.innerHTML = `<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>`;

		games_container.appendChild(spinner);
	};

	const hide_loading = () => {
		const spinner = document.getElementById('loading-spinner');

		if (spinner) {
			spinner.remove();
		}
	};

	const fetch_games = async () => {
		const gamertag = gamertag_input ? gamertag_input.value.trim() : '';

		if (!gamertag) {
			return;
		}

		show_loading();

		try {
			const xuid = await get_xuid_from_gamertag(gamertag);

			current_gamertag = gamertag;
			current_xuid = xuid;

			await fetch_games_by_xuid(xuid);
		} catch (err) {
			show_error(err.message);
		} finally {
			hide_loading();
		}
	};

	const reload_games = async () => {
		if (!current_xuid) {
			show_error('Load a Gamertag first');
			return;
		}

		show_loading();

		try {
			await fetch_games_by_xuid(current_xuid);
		} catch (err) {
			show_error(err.message);
		} finally {
			hide_loading();
		}
	};

	gamertag_loader.addEventListener('submit', (event) => {
		event.preventDefault();
		fetch_games();
	});

	reload_btn.addEventListener('click', reload_games);

	const save_json = () => {
		const data = full_data ? full_data : [];
		const json = JSON.stringify(data, null, 2);
		const iso = new Date().toISOString();
		const filename_parts = [];

		filename_parts.push('Xbox Achievements');

		if (current_gamertag) {
			filename_parts.push(current_gamertag);
		}

		filename_parts.push(formatDateUTC(iso).replace(/:/g, '-'));

		const filename = filename_parts.join(' ') + '.json';
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');

		a.href = url;
		a.download = filename;

		document.body.appendChild(a);
		a.click();
		a.remove();

		URL.revokeObjectURL(url);
	};

	if (save_btn) {
		save_btn.addEventListener('click', save_json);
	}

	view_btn.addEventListener('click', () => {
		is_grid_view = !is_grid_view;
		update_container_classes();
	});

	const update_container_classes = () => {
		if (is_grid_view) {
			games_container.className = 'row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3';
			view_btn.textContent = 'List view';
			document.querySelectorAll('#games-container .card').forEach(card => {
				card.classList.remove('list-view');
			});
		} else {
			games_container.className = 'row row-cols-1 g-3';
			view_btn.textContent = 'Grid view';
			document.querySelectorAll('#games-container .card').forEach(card => {
				card.classList.add('list-view', 'shadow-sm');
			});
		}
	};

	const render_games = (games) => {
		games_container.innerHTML = '';

		games.forEach((game) => {
			const name = game.name || 'Unknown';
			const title_id = game.titleId || '-';
			const pfn = game.pfn || '-';
			const devices = game.devices && game.devices.length ? game.devices.join(', ') : '-';
			const last_played = game.titleHistory && game.titleHistory.lastTimePlayed
				? formatDateUTC(game.titleHistory.lastTimePlayed)
				: 'Never';

			const achievement = game.achievement && typeof game.achievement === 'object' ? game.achievement : {};
			const current_achievements = achievement.currentAchievements || 0;
			const current_gamerscore = achievement.currentGamerscore || 0;
			const total_gamerscore = achievement.totalGamerscore || 0;
			const progress_percentage = achievement.progressPercentage || 0;

			const achievement_html = `
<div class="achievement-info mt-1">
	<div class="achievement-row mb-1">
		<span class="achievement-g">G</span>
		<span>${current_gamerscore}/${total_gamerscore}</span>
		<i class="bi bi-trophy achievement-trophy"></i>
		<span>${current_achievements}</span>
		<span class="achievement-percentage">${progress_percentage}%</span>
	</div>
	<div class="progress">
		<div class="progress-bar" role="progressbar" style="width: ${progress_percentage}%; background-color: #107C10;" aria-valuenow="${progress_percentage}" aria-valuemin="0" aria-valuemax="100"></div>
	</div>
</div>
`;

			const display_image = game.displayImage
				? proxy_url + '/?url=' + encodeURIComponent(game.displayImage)
				: '';
			const image_html = display_image
				? `<img src="${display_image}" class="list-img" alt="${ escape_html(name) }">`
				: `
<div class="list-img image-placeholder" aria-label="No image" role="img">
	<i class="bi bi-image" aria-hidden="true"></i>
</div>`;

			const col = document.createElement('div');
			col.className = 'col';

			col.innerHTML = `
<div class="card shadow-sm">
	<div class="d-flex align-items-start list-view-container p-2">
		${ image_html }
		<div class="card-body p-0">
			<h5 class="card-title">${ escape_html(name) }</h5>
			<ul class="list-unstyled mb-0">
				<li><strong>ID:</strong> ${ title_id } <strong>PFN:</strong> ${ escape_html(pfn) }</li>
				<li><strong>Devices:</strong> ${ escape_html(devices) }</li>
				<li><strong>Last played:</strong> ${ last_played }</li>
			</ul>
			${ achievement_html }
		</div>
	</div>
</div>
`;

			games_container.appendChild(col);
		});

		update_container_classes();
	};

	const show_error = (message) => {
		error_text.textContent = message;
		error_box.classList.remove('d-none');
	};

	const escape_html = (value) => {
		return String(value)
			.replaceAll('&', '&amp;')
			.replaceAll('<', '&lt;')
			.replaceAll('>', '&gt;');
	};

	const formatDateUTC = (isoString) => {
		const d = new Date(isoString);
		const pad = (n) => String(n).padStart(2, '0');

		const year = d.getUTCFullYear();
		const month = pad(d.getUTCMonth() + 1);
		const day = pad(d.getUTCDate());

		const hours = pad(d.getUTCHours());
		const minutes = pad(d.getUTCMinutes());
		const seconds = pad(d.getUTCSeconds());

		return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
	};
});