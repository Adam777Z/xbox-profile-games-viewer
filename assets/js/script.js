document.addEventListener('DOMContentLoaded', () => {
	const load_btn = document.getElementById('load-btn');
	const reload_btn = document.getElementById('reload-btn');
	const view_btn = document.getElementById('view-btn');

	const save_btn = document.getElementById('save-btn');

	const input_view = document.getElementById('input-view');
	const games_view = document.getElementById('games-view');
	const games_container = document.getElementById('games-container');

	const error_box = document.getElementById('error-box');
	const error_text = document.getElementById('error-text');

	let full_data = null;
	let games_data = null;
	let is_grid_view = false;

	const proxy_url = config['proxy_url'];
	const api_key = config['api_key'];
	const api_endpoint = 'https://xbl.io/api/v2/achievements';

	const fetch_games = async () => {
		error_box.classList.add('d-none');
		games_container.innerHTML = '';

		// Hide load button immediately
		input_view.classList.add('d-none');

		// Show games container immediately
		games_view.classList.remove('d-none');

		// Show loading spinner
		const spinner = document.createElement('div');
		spinner.className = 'd-flex justify-content-center w-100 my-3';
		spinner.innerHTML = `<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>`;
		games_container.appendChild(spinner);

		try {
			const response = await fetch('https://' + proxy_url + '/?url=' + encodeURIComponent(api_endpoint), {
				headers: {
					'accept': '*/*',
					'x-authorization': api_key
				}
			});
			if (!response.ok) throw new Error('Network response was not ok');

			const data = await response.json();
			if (!data.titles || !Array.isArray(data.titles)) throw new Error('Invalid JSON structure');

			full_data = data;
			games_data = data.titles;

			render_games(games_data);
			update_container_classes();
		} catch (err) {
			show_error(err.message);
		} finally {
			spinner.remove();
		}
	};

	// Event listeners
	load_btn.addEventListener('click', fetch_games);
	reload_btn.addEventListener('click', fetch_games);

	// Save JSON when requested
	const save_json = () => {
		const data = full_data ? full_data : [];
		const json = JSON.stringify(data, null, 2);
		const iso = new Date().toISOString();
		const filename = 'Xbox Achievements ' + formatDateUTC(iso).replace(/:/g, '-') + '.json';
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

	// Update container and card classes for current view
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

	// Render games
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
				? 'https://' + proxy_url + '/?url=' + encodeURIComponent(game.displayImage)
				: '';

			const col = document.createElement('div');
			col.className = 'col';

			col.innerHTML = `
<div class="card shadow-sm">
	<div class="d-flex align-items-start list-view-container p-2">
		${ display_image ? `<img src="${display_image}" class="list-img" alt="">` : '' }
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

		// Ensure cards have correct classes after rendering
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