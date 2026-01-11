document.addEventListener('DOMContentLoaded', () => {
	const json_input = document.getElementById('json-input');
	const load_btn = document.getElementById('load-btn');
	const back_btn = document.getElementById('back-btn');
	const view_btn = document.getElementById('view-btn');

	const input_view = document.getElementById('input-view');
	const games_view = document.getElementById('games-view');
	const games_container = document.getElementById('games-container');

	const error_box = document.getElementById('error-box');
	const error_text = document.getElementById('error-text');

	let games_data = null;
	let is_grid_view = false;

	load_btn.addEventListener('click', () => {
		error_box.classList.add('d-none');
		games_container.innerHTML = '';

		let parsed_json;

		try {
			parsed_json = JSON.parse(json_input.value);
		} catch (error) {
			show_error('Invalid JSON format.');
			return;
		}

		if (!parsed_json.titles || !Array.isArray(parsed_json.titles)) {
			show_error('JSON does not contain a valid titles array.');
			return;
		}

		games_data = parsed_json.titles;

		// Default to list view
		games_container.className = 'row row-cols-1 g-3';
		is_grid_view = false;
		view_btn.textContent = 'Grid view';

		render_games(games_data);

		document.querySelectorAll('#games-container .card').forEach(card => {
			card.classList.add('list-view', 'shadow-sm');
		});

		input_view.classList.add('d-none');
		games_view.classList.remove('d-none');
	});

	back_btn.addEventListener('click', () => {
		games_view.classList.add('d-none');
		input_view.classList.remove('d-none');
	});

	view_btn.addEventListener('click', () => {
		if (is_grid_view) {
			// List view
			games_container.className = 'row row-cols-1 g-3';
			view_btn.textContent = 'Grid view';
			document.querySelectorAll('#games-container .card').forEach(card => {
				card.classList.add('list-view', 'shadow-sm');
			});
		} else {
			// Grid view
			games_container.className = 'row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3';
			view_btn.textContent = 'List view';
			document.querySelectorAll('#games-container .card').forEach(card => {
				card.classList.remove('list-view');
			});
		}
		is_grid_view = !is_grid_view;
	});

	const render_games = (games) => {
		games.forEach((game) => {
			const name = game.name ?? 'Unknown';
			const title_id = game.titleId ?? '-';
			const pfn = game.pfn ?? '-';
			const devices = game.devices ? game.devices.join(', ') : '-';
			const last_played = game.titleHistory?.lastTimePlayed
				? formatDateUTC(game.titleHistory.lastTimePlayed)
				: 'Never';

			// Achievements
			const achievement = game.achievement ?? {};
			const current_achievements = achievement.currentAchievements ?? 0;
			const total_achievements = achievement.totalAchievements ?? 0;
			const current_gamerscore = achievement.currentGamerscore ?? 0;
			const total_gamerscore = achievement.totalGamerscore ?? 0;
			const progress_percentage = achievement.progressPercentage ?? 0;

			const achievement_html = `
<div class='achievement-info mt-1'>
	<div class='achievement-row mb-1'>
		<span class='achievement-g'>G</span>
		<span>${current_gamerscore}/${total_gamerscore}</span>
		<i class='bi bi-trophy achievement-trophy'></i>
		<span>${current_achievements}</span>
		<span class='achievement-percentage'>${progress_percentage}%</span>
	</div>
	<div class='progress'>
		<div class='progress-bar' role='progressbar' style='width: ${progress_percentage}%; background-color: #107C10;' aria-valuenow='${progress_percentage}' aria-valuemin='0' aria-valuemax='100'></div>
	</div>
</div>
`;

			// Proxy for images
			const proxy_url = config['proxy_url'] ?? '';
			const display_image = game.displayImage
				? 'https://' + proxy_url + '/?url=' + encodeURIComponent(game.displayImage)
				: '';

			const col = document.createElement('div');
			col.className = 'col';

			col.innerHTML = `
<div class='card shadow-sm list-view'>
	<div class="d-flex align-items-start list-view-container p-2">
		${ display_image ? `<img src='${display_image}' class='list-img' alt=''>` : '' }
		<div class='card-body p-0'>
			<h5 class='card-title'>${ escape_html(name) }</h5>
			<ul class='list-unstyled mb-0'>
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