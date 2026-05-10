// script.js
const API_KEY = "da01d7158a60be461c607c6d31470b4e";
const BASE_URL = "https://v3.football.api-sports.io";

async function apiCall(endpoint, params = {}) {
    const url = new URL(BASE_URL + endpoint);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    try {
        const response = await fetch(url, {
            headers: {
                'x-apisports-key': API_KEY
            }
        });
        if (!response.ok) return null;
        const data = await response.json();
        return data.response;
    } catch (error) {
        console.error("API Error:", error);
        return null;
    }
}

// Show different sections
function showSection(section) {
    document.querySelectorAll('.section').forEach(sec => {
        sec.classList.remove('active');
    });
    document.getElementById(section + '-section').classList.add('active');

    if (section === 'live') loadLiveMatches();
    if (section === 'standings') loadLeagues();
    if (section === 'fixtures') loadFixtures();
}

// Load Live Matches (Smaller cards)
async function loadLiveMatches() {
    const container = document.getElementById('live-matches');
    container.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:#94a3b8;">Loading live matches...</p>';

    const fixtures = await apiCall('/fixtures', { live: 'all' });
    container.innerHTML = '';

    if (!fixtures || fixtures.length === 0) {
        container.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:#94a3b8;">No live matches at the moment</p>';
        return;
    }

    fixtures.forEach(fix => {
        const card = createMatchCard(fix, true);
        container.appendChild(card);
    });
}

// Create Match Card
function createMatchCard(fixture, isLive = false) {
    const card = document.createElement('div');
    card.className = 'match-card';
    card.onclick = () => openMatchDetail(fixture);

    const statusHTML = isLive 
        ? `<span class="live-badge">LIVE • ${fixture.fixture.status.elapsed || 0}'</span>`
        : `<span>${new Date(fixture.fixture.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>`;

    card.innerHTML = `
        <div class="match-header">
            <div>${fixture.league.name}</div>
            <div>${statusHTML}</div>
        </div>
        <div class="teams">
            <div class="team">
                <img src="\( {fixture.teams.home.logo}" class="team-logo" alt=" \){fixture.teams.home.name}">
                <div class="team-name">${fixture.teams.home.name}</div>
            </div>
            <div class="score">
                ${fixture.goals.home !== null ? fixture.goals.home : '-'} : ${fixture.goals.away !== null ? fixture.goals.away : '-'}
            </div>
            <div class="team">
                <img src="\( {fixture.teams.away.logo}" class="team-logo" alt=" \){fixture.teams.away.name}">
                <div class="team-name">${fixture.teams.away.name}</div>
            </div>
        </div>
    `;
    return card;
}

// Open Match Detail Modal
async function openMatchDetail(fixture) {
    const modal = document.getElementById('team-modal');
    modal.style.display = 'block';

    document.getElementById('modal-team-header').innerHTML = `
        <h2 style="text-align:center; margin:10px 0;">
            ${fixture.teams.home.name} 
            <img src="${fixture.teams.home.logo}" width="45" style="vertical-align:middle;"> 
            vs 
            <img src="${fixture.teams.away.logo}" width="45" style="vertical-align:middle;"> 
            ${fixture.teams.away.name}
        </h2>
        <p style="text-align:center; color:#94a3b8;">${fixture.league.name} • ${new Date(fixture.fixture.date).toLocaleString()}</p>
    `;

    // Live Video Tab (Replace with real streaming URL when available)
    document.getElementById('live-video').src = "https://www.youtube.com/embed/dQw4w9wgxcq";

    const fixtureId = fixture.fixture.id;
    
    loadLineups(fixtureId);
    loadStats(fixtureId);
    loadEvents(fixtureId);
    loadOdds(fixtureId);
    loadPreview(fixture);
}

// Lineups
async function loadLineups(fixtureId) {
    const data = await apiCall('/fixtures', { id: fixtureId });
    if (!data || !data[0]) {
        document.getElementById('lineup-content').innerHTML = "<p>Lineups not available yet.</p>";
        return;
    }
    const fixture = data[0];
    let html = '<div class="lineups">';

    if (fixture.lineups && fixture.lineups.length > 0) {
        fixture.lineups.forEach((teamLineup, index) => {
            html += `
                <div class="lineup-team">
                    <h3>\( {teamLineup.team.name} ( \){teamLineup.formation})</h3>
                    <ul style="list-style:none; padding:10px 0;">
                        \( {teamLineup.startXI.map(p => `<li> \){p.player.number} - ${p.player.name}</li>`).join('')}
                    </ul>
                </div>`;
        });
    } else {
        html += "<p>Lineups will be available closer to kick-off.</p>";
    }
    html += '</div>';
    document.getElementById('lineup-content').innerHTML = html;
}

// Stats (All categories you requested)
async function loadStats(fixtureId) {
    const data = await apiCall('/fixtures', { id: fixtureId });
    if (!data || !data[0]) return;

    const stats = data[0].statistics || [];
    const html = `
        <div class="stat-category">
            <h3>Attack</h3>
            <div class="stat-item"><span>Total Shots</span><span>${getStat(stats,0,'Total Shots')} - ${getStat(stats,1,'Total Shots')}</span></div>
            <div class="stat-item"><span>Shots on Target</span><span>${getStat(stats,0,'Shots on Goal')} - ${getStat(stats,1,'Shots on Goal')}</span></div>
            <div class="stat-item"><span>Shots off Target</span><span>${getStat(stats,0,'Shots off Goal')} - ${getStat(stats,1,'Shots off Goal')}</span></div>
            <div class="stat-item"><span>Blocked Shots</span><span>${getStat(stats,0,'Blocked Shots')} - ${getStat(stats,1,'Blocked Shots')}</span></div>
        </div>

        <div class="stat-category">
            <h3>Possession & Distribution</h3>
            <div class="stat-item"><span>Ball Possession</span><span>${getStat(stats,0,'Ball Possession')} - ${getStat(stats,1,'Ball Possession')}</span></div>
            <div class="stat-item"><span>Total Passes</span><span>${getStat(stats,0,'Total passes')} - ${getStat(stats,1,'Total passes')}</span></div>
            <div class="stat-item"><span>Completed Passes</span><span>${getStat(stats,0,'Passes accurate')} - ${getStat(stats,1,'Passes accurate')}</span></div>
        </div>

        <div class="stat-category">
            <h3>Defence</h3>
            <div class="stat-item"><span>Goalkeeper Saves</span><span>${getStat(stats,0,'Goalkeeper Saves')} - ${getStat(stats,1,'Goalkeeper Saves')}</span></div>
            <div class="stat-item"><span>Tackles</span><span>${getStat(stats,0,'Tackles')} - ${getStat(stats,1,'Tackles')}</span></div>
        </div>

        <div class="stat-category">
            <h3>Discipline</h3>
            <div class="stat-item"><span>Fouls</span><span>${getStat(stats,0,'Fouls')} - ${getStat(stats,1,'Fouls')}</span></div>
            <div class="stat-item"><span>Yellow Cards</span><span>${getStat(stats,0,'Yellow Cards')} - ${getStat(stats,1,'Yellow Cards')}</span></div>
            <div class="stat-item"><span>Red Cards</span><span>${getStat(stats,0,'Red Cards')} - ${getStat(stats,1,'Red Cards')}</span></div>
        </div>
    `;
    document.getElementById('stats-content').innerHTML = html;
}

function getStat(stats, teamIndex, type) {
    if (!stats[teamIndex]) return 0;
    const found = stats[teamIndex].statistics.find(s => s.type === type);
    return found ? found.value : 0;
}

// Events
async function loadEvents(fixtureId) {
    const events = await apiCall('/fixtures/events', { fixture: fixtureId });
    let html = '<h3>Match Events</h3><ul style="list-style:none;">';
    
    if (events && events.length > 0) {
        events.forEach(ev => {
            html += `<li><strong>${ev.time.elapsed}'</strong> - ${ev.team.name}: \( {ev.type} ( \){ev.detail}) ${ev.player ? '- ' + ev.player.name : ''}</li>`;
        });
    } else {
        html += "<li>No events recorded yet.</li>";
    }
    html += '</ul>';
    document.getElementById('events-content').innerHTML = html;
}

// Odds
async function loadOdds(fixtureId) {
    const oddsData = await apiCall('/odds', { fixture: fixtureId });
    let html = '<h3>Betting Odds</h3>';
    
    if (oddsData && oddsData.length > 0) {
        oddsData.forEach(odd => {
            html += `<p><strong>${odd.bookmaker.name}</strong>: ${odd.bets ? odd.bets[0]?.values.map(v => v.odd).join(' / ') : 'N/A'}</p>`;
        });
    } else {
        html += "<p>Odds data not available (check your API subscription).</p>";
    }
    document.getElementById('odds-content').innerHTML = html;
}

// Preview & Analysis
function loadPreview(fixture) {
    document.getElementById('preview-content').innerHTML = `
        <h3>Match Preview & Analysis</h3>
        <p><strong>\( {fixture.teams.home.name}</strong> vs <strong> \){fixture.teams.away.name}</strong></p>
        <p>Recent form, head-to-head, and tactical analysis will be displayed here.</p>
        <p><em>More detailed preview coming soon...</em></p>
    `;
}

// Standings & Leagues
async function loadLeagues() {
    const leagues = await apiCall('/leagues');
    const select = document.getElementById('league-select');
    select.innerHTML = '<option value="">Select League</option>';
    
    if (leagues) {
        leagues.slice(0, 25).forEach(l => {
            const opt = document.createElement('option');
            opt.value = l.league.id;
            opt.textContent = `\( {l.league.name} ( \){l.country.name})`;
            select.appendChild(opt);
        });
    }
}

async function loadStandings() {
    const leagueId = document.getElementById('league-select').value;
    if (!leagueId) return;

    const standings = await apiCall('/standings', { league: leagueId, season: '2025' });
    const tbody = document.getElementById('standings-body');
    tbody.innerHTML = '';

    if (!standings || !standings[0]) return;

    standings[0].league.standings[0].forEach(team => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${team.rank}</td>
            <td><img src="${team.team.logo}" width="24" style="vertical-align:middle; margin-right:8px;"> ${team.team.name}</td>
            <td>${team.all.played}</td>
            <td>${team.all.win}</td>
            <td>${team.all.draw}</td>
            <td>${team.all.lose}</td>
            <td>${team.all.goals.for}</td>
            <td>${team.all.goals.against}</td>
            <td>${team.goalsDiff}</td>
            <td><strong>${team.points}</strong></td>
        `;
        tbody.appendChild(tr);
    });
}

// Fixtures
async function loadFixtures() {
    const container = document.getElementById('fixtures');
    container.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:#94a3b8;">Loading upcoming fixtures...</p>';

    const fixtures = await apiCall('/fixtures', { next: 20 });
    container.innerHTML = '';

    if (!fixtures) return;

    fixtures.forEach(fix => {
        const card = createMatchCard(fix, false);
        container.appendChild(card);
    });
}

// Tab Switching
function switchTab(n) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(['tab-video','tab-lineup','tab-stats','tab-events','tab-odds','tab-preview'][n]).classList.add('active');
    document.querySelectorAll('.tab-btn')[n].classList.add('active');
}

function closeModal() {
    document.getElementById('team-modal').style.display = 'none';
    document.getElementById('live-video').src = ''; // Stop video
}

// Search (Basic)
function searchTeams() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    console.log("Searching for:", term);
    // You can extend this to filter cards
}

// Initialize App
window.onload = () => {
    loadLiveMatches();
    
    // Auto refresh live matches
    setInterval(() => {
        if (document.getElementById('live-section').classList.contains('active')) {
            loadLiveMatches();
        }
    }, 30000);
};
