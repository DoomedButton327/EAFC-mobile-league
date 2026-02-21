/* ============================================================
   METTLESTATE × EA FC MOBILE LEAGUE — App.js
   ============================================================ */

// ---- STATE ----
let players  = JSON.parse(localStorage.getItem('eafc_players'))  || [];
let fixtures = JSON.parse(localStorage.getItem('eafc_fixtures')) || [];
let results  = JSON.parse(localStorage.getItem('eafc_results'))  || [];

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    renderAll();
    updatePlayerDatalist();
    updateScoreSelect();
    updatePlayerCount();

    document.getElementById('playerImport').addEventListener('change', e => {
        const name = e.target.files[0]?.name || 'No file chosen';
        document.getElementById('file-chosen').textContent = name;
    });

    document.getElementById('importBackup').addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const data = JSON.parse(ev.target.result);
                if (data.players)  players  = data.players;
                if (data.fixtures) fixtures = data.fixtures;
                if (data.results)  results  = data.results;
                saveData();
                renderAll();
                toast('Backup restored successfully!', 'success');
            } catch {
                toast('Invalid backup file.', 'error');
            }
        };
        reader.readAsText(file);
    });
});

// ---- NAVIGATION ----
function initNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(tab).classList.add('active');
        });
    });
}

// Fallback for old onclick-style calls
function switchTab(tabId) {
    document.querySelectorAll('.nav-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === tabId);
    });
    document.querySelectorAll('.tab-content').forEach(t => {
        t.classList.toggle('active', t.id === tabId);
    });
}

// ---- RENDER ALL ----
function renderAll() {
    renderLeaderboard();
    renderFixtures();
    renderResults();
    renderPlayerManagement();
    updatePlayerDatalist();
    updateScoreSelect();
    updatePlayerCount();
}

// ---- LEADERBOARD ----
function renderLeaderboard() {
    const sorted = [...players].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        const gdA = (a.gf || 0) - (a.ga || 0);
        const gdB = (b.gf || 0) - (b.ga || 0);
        if (gdB !== gdA) return gdB - gdA;
        return (b.gf || 0) - (a.gf || 0);
    });

    const tbody = document.getElementById('leaderboardBody');
    tbody.innerHTML = '';

    // Podium
    const podium = document.getElementById('podium-area');
    if (sorted.length >= 3) {
        podium.style.display = 'grid';
        const [first, second, third] = sorted;
        podium.innerHTML = `
            <div class="podium-card rank-2">
                <div class="podium-medal">🥈</div>
                <div class="podium-name">${second.username}</div>
                <div class="podium-pts">2nd · <strong>${second.points}</strong> pts</div>
            </div>
            <div class="podium-card rank-1">
                <div class="podium-medal">🥇</div>
                <div class="podium-name">${first.username}</div>
                <div class="podium-pts">1st · <strong>${first.points}</strong> pts</div>
            </div>
            <div class="podium-card rank-3">
                <div class="podium-medal">🥉</div>
                <div class="podium-name">${third.username}</div>
                <div class="podium-pts">3rd · <strong>${third.points}</strong> pts</div>
            </div>
        `;
    } else {
        podium.style.display = 'none';
    }

    sorted.forEach((p, i) => {
        const rank = i + 1;
        const gd   = (p.gf || 0) - (p.ga || 0);
        const gdStr = gd > 0 ? `<span class="gd-pos">+${gd}</span>` : gd < 0 ? `<span class="gd-neg">${gd}</span>` : `<span>${gd}</span>`;
        const pos  = rank <= 3 ? `pos-${rank}` : 'pos-n';
        const zone = rank <= 3 ? 'zone-champ' : sorted.length >= 5 && rank >= sorted.length - 1 ? 'zone-danger' : '';
        const form = buildFormBadges(p.form || []);

        const tr = document.createElement('tr');
        tr.className = zone;
        tr.innerHTML = `
            <td><span class="pos-badge ${pos}">${rank}</span></td>
            <td>
                <div class="player-cell-name">${p.name}</div>
                <div class="player-cell-username">${p.username}</div>
            </td>
            <td>${p.played || 0}</td>
            <td>${p.wins || 0}</td>
            <td>${p.draws || 0}</td>
            <td>${p.losses || 0}</td>
            <td>${p.gf || 0}</td>
            <td>${p.ga || 0}</td>
            <td>${gdStr}</td>
            <td class="pts-cell">${p.points || 0}</td>
            <td><div class="form-badges">${form}</div></td>
        `;
        tbody.appendChild(tr);
    });
}

function buildFormBadges(form) {
    return (form || []).slice(-5).map(r => {
        if (r === 'W') return `<span class="form-w">W</span>`;
        if (r === 'D') return `<span class="form-d">D</span>`;
        return `<span class="form-l">L</span>`;
    }).join('');
}

// ---- FIXTURES ----
function renderFixtures() {
    const grid = document.getElementById('fixtures-grid');
    grid.innerHTML = '';

    if (fixtures.length === 0) {
        grid.innerHTML = `<div class="empty-state"><i class="fas fa-futbol"></i>No fixtures scheduled yet.<br>Use Admin to generate or add matches.</div>`;
        return;
    }

    fixtures.forEach(match => {
        const div = document.createElement('div');
        div.className = 'fixture-card';
        div.innerHTML = `
            <div class="fixture-player">${match.home}</div>
            <div class="vs-badge">VS</div>
            <div class="fixture-player">${match.away}</div>
            <div class="match-actions">
                <button class="btn-win-home" onclick="resolveMatch('${match.id}', 'home')" title="${match.home} wins">🏆 ${truncate(match.home, 8)}</button>
                <button class="btn-match-draw" onclick="resolveMatch('${match.id}', 'draw')">DRAW</button>
                <button class="btn-win-away" onclick="resolveMatch('${match.id}', 'away')" title="${match.away} wins">🏆 ${truncate(match.away, 8)}</button>
            </div>
        `;
        grid.appendChild(div);
    });
}

// ---- RESULTS ----
function renderResults() {
    const list = document.getElementById('results-list');
    list.innerHTML = '';

    if (results.length === 0) {
        list.innerHTML = `<div class="empty-state"><i class="fas fa-check-double"></i>No results recorded yet.</div>`;
        return;
    }

    // Show newest first
    [...results].reverse().forEach(r => {
        const isDraw  = r.result === 'draw';
        const homeWon = r.result === 'home';
        const awayWon = r.result === 'away';

        const homeScore = r.homeGoals !== undefined ? r.homeGoals : (isDraw ? '—' : homeWon ? '✓' : '✗');
        const awayScore = r.awayGoals !== undefined ? r.awayGoals : (isDraw ? '—' : awayWon ? '✓' : '✗');
        const scoreDisplay = r.homeGoals !== undefined ? `${r.homeGoals} — ${r.awayGoals}` : (isDraw ? 'DRAW' : homeWon ? `${r.home} WIN` : `${r.away} WIN`);

        const div = document.createElement('div');
        div.className = 'result-item';
        div.innerHTML = `
            <div class="result-home">
                <div class="result-player-name ${homeWon ? 'winner' : ''}">${r.home}</div>
                ${homeWon ? '<span class="result-badge badge-win">WIN</span>' : isDraw ? '<span class="result-badge badge-draw">DRAW</span>' : '<span class="result-badge badge-loss">LOSS</span>'}
            </div>
            <div class="score-box">${scoreDisplay}</div>
            <div class="result-away">
                <div class="result-player-name ${awayWon ? 'winner' : ''}">${r.away}</div>
                ${awayWon ? '<span class="result-badge badge-win">WIN</span>' : isDraw ? '<span class="result-badge badge-draw">DRAW</span>' : '<span class="result-badge badge-loss">LOSS</span>'}
            </div>
        `;
        list.appendChild(div);
    });
}

// ---- PLAYER MANAGEMENT ----
function renderPlayerManagement() {
    const tbody = document.getElementById('playerMgmtBody');
    tbody.innerHTML = '';

    players.forEach((p, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="pos-badge pos-n">${i + 1}</span></td>
            <td><div class="player-cell-name">${p.name}</div></td>
            <td><div class="player-cell-username" style="color:var(--text)">${p.username}</div></td>
            <td style="color:var(--muted); font-size:0.85rem">${p.phone || 'N/A'}</td>
            <td style="font-size:0.82rem; color:var(--muted)">P: ${p.played||0} · W: ${p.wins||0} · D: ${p.draws||0} · L: ${p.losses||0}</td>
            <td>
                <button onclick="deletePlayer(${i})" style="background:rgba(255,59,59,0.1); color:var(--red); border:1px solid rgba(255,59,59,0.2); padding:6px 12px; font-size:0.75rem; margin:0; width:auto;">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ---- RESOLVE MATCH (quick win/draw) ----
function resolveMatch(id, result) {
    const idx = fixtures.findIndex(f => String(f.id) === String(id));
    if (idx === -1) return;
    const match = fixtures[idx];

    const homeP = players.find(p => p.username === match.home);
    const awayP = players.find(p => p.username === match.away);

    if (homeP && awayP) {
        homeP.played = (homeP.played || 0) + 1;
        awayP.played = (awayP.played || 0) + 1;

        if (result === 'draw') {
            homeP.draws   = (homeP.draws   || 0) + 1;
            homeP.points  = (homeP.points  || 0) + 1;
            awayP.draws   = (awayP.draws   || 0) + 1;
            awayP.points  = (awayP.points  || 0) + 1;
            addForm(homeP, 'D'); addForm(awayP, 'D');
        } else if (result === 'home') {
            homeP.wins    = (homeP.wins    || 0) + 1;
            homeP.points  = (homeP.points  || 0) + 3;
            awayP.losses  = (awayP.losses  || 0) + 1;
            addForm(homeP, 'W'); addForm(awayP, 'L');
        } else if (result === 'away') {
            awayP.wins    = (awayP.wins    || 0) + 1;
            awayP.points  = (awayP.points  || 0) + 3;
            homeP.losses  = (homeP.losses  || 0) + 1;
            addForm(homeP, 'L'); addForm(awayP, 'W');
        }

        results.push({ home: match.home, away: match.away, result, id: Date.now() });
        fixtures.splice(idx, 1);
        saveData();
        renderAll();
        toast(`Result logged: ${match.home} vs ${match.away}`, 'success');
    }
}

// ---- LOG SCORE (with actual goals) ----
function logScore() {
    const sel   = document.getElementById('scoreFixtureSelect');
    const hg    = parseInt(document.getElementById('scoreHome').value);
    const ag    = parseInt(document.getElementById('scoreAway').value);
    const id    = sel.value;

    if (!id) { toast('Select a fixture', 'error'); return; }
    if (isNaN(hg) || isNaN(ag)) { toast('Enter both scores', 'error'); return; }

    const idx = fixtures.findIndex(f => String(f.id) === String(id));
    if (idx === -1) return;
    const match = fixtures[idx];

    const homeP = players.find(p => p.username === match.home);
    const awayP = players.find(p => p.username === match.away);

    if (homeP && awayP) {
        homeP.played = (homeP.played || 0) + 1;
        awayP.played = (awayP.played || 0) + 1;
        homeP.gf = (homeP.gf || 0) + hg;
        homeP.ga = (homeP.ga || 0) + ag;
        awayP.gf = (awayP.gf || 0) + ag;
        awayP.ga = (awayP.ga || 0) + hg;

        let result;
        if (hg > ag) {
            result = 'home';
            homeP.wins   = (homeP.wins   || 0) + 1;
            homeP.points = (homeP.points || 0) + 3;
            awayP.losses = (awayP.losses || 0) + 1;
            addForm(homeP, 'W'); addForm(awayP, 'L');
        } else if (ag > hg) {
            result = 'away';
            awayP.wins   = (awayP.wins   || 0) + 1;
            awayP.points = (awayP.points || 0) + 3;
            homeP.losses = (homeP.losses || 0) + 1;
            addForm(homeP, 'L'); addForm(awayP, 'W');
        } else {
            result = 'draw';
            homeP.draws  = (homeP.draws  || 0) + 1;
            homeP.points = (homeP.points || 0) + 1;
            awayP.draws  = (awayP.draws  || 0) + 1;
            awayP.points = (awayP.points || 0) + 1;
            addForm(homeP, 'D'); addForm(awayP, 'D');
        }

        results.push({ home: match.home, away: match.away, result, homeGoals: hg, awayGoals: ag, id: Date.now() });
        fixtures.splice(idx, 1);
        saveData();
        renderAll();
        document.getElementById('scoreHome').value = '';
        document.getElementById('scoreAway').value = '';
        toast(`Score logged: ${match.home} ${hg}–${ag} ${match.away}`, 'success');
    }
}

function addForm(player, result) {
    if (!player.form) player.form = [];
    player.form.push(result);
    if (player.form.length > 10) player.form = player.form.slice(-10);
}

function updateScoreSelect() {
    const sel = document.getElementById('scoreFixtureSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">— Select Fixture —</option>';
    fixtures.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f.id;
        opt.textContent = `${f.home} vs ${f.away}`;
        sel.appendChild(opt);
    });
}

// ---- IMPORT ----
function processImport() {
    const file = document.getElementById('playerImport').files[0];
    if (!file) { toast('Select a file first', 'error'); return; }

    const reader = new FileReader();
    reader.onload = e => {
        const lines = e.target.result.split('\n').filter(l => l.trim());
        let added = 0;
        lines.forEach(line => {
            const parts = line.split(',');
            if (parts.length >= 2) {
                const username = parts[1].trim();
                if (!players.some(p => p.username === username)) {
                    players.push(mkPlayer(parts[0].trim(), username, parts[2]?.trim() || 'N/A'));
                    added++;
                }
            }
        });
        saveData();
        renderAll();
        toast(`Imported ${added} players. Total: ${players.length}`, 'success');
    };
    reader.readAsText(file);
}

function addSinglePlayer() {
    const name     = document.getElementById('addName').value.trim();
    const username = document.getElementById('addUsername').value.trim();
    const phone    = document.getElementById('addPhone').value.trim();
    if (!name || !username) { toast('Name and username required', 'error'); return; }
    if (players.some(p => p.username === username)) { toast('Username already exists', 'error'); return; }
    players.push(mkPlayer(name, username, phone || 'N/A'));
    saveData();
    renderAll();
    document.getElementById('addName').value = '';
    document.getElementById('addUsername').value = '';
    document.getElementById('addPhone').value = '';
    toast(`${username} added!`, 'success');
}

function mkPlayer(name, username, phone) {
    return { name, username, phone, played: 0, wins: 0, draws: 0, losses: 0, points: 0, gf: 0, ga: 0, form: [] };
}

function deletePlayer(index) {
    if (!confirm(`Remove ${players[index].username} from the league?`)) return;
    players.splice(index, 1);
    saveData();
    renderAll();
    toast('Player removed', 'success');
}

// ---- GENERATE DRAW ----
function generateDraw() {
    if (players.length < 2) { toast('Not enough players!', 'error'); return; }
    const mode = document.getElementById('matchday-select').value;

    if (mode === 'roundrobin') {
        // All vs all (each pair once)
        const newFixtures = [];
        for (let i = 0; i < players.length; i++) {
            for (let j = i + 1; j < players.length; j++) {
                // Skip if already scheduled
                const exists = fixtures.some(f =>
                    (f.home === players[i].username && f.away === players[j].username) ||
                    (f.home === players[j].username && f.away === players[i].username)
                );
                if (!exists) {
                    newFixtures.push({ home: players[i].username, away: players[j].username, id: Date.now() + Math.random() });
                }
            }
        }
        fixtures = [...fixtures, ...newFixtures];
        toast(`Generated ${newFixtures.length} round-robin fixtures`, 'success');
    } else {
        const shuffled = [...players].sort(() => 0.5 - Math.random());
        const newFixtures = [];
        for (let i = 0; i < shuffled.length - 1; i += 2) {
            newFixtures.push({ home: shuffled[i].username, away: shuffled[i + 1].username, id: Date.now() + i });
        }
        fixtures = [...fixtures, ...newFixtures];
        toast(`Generated ${newFixtures.length} random fixtures`, 'success');
    }

    saveData();
    renderAll();
    switchTab('fixtures');
}

function addManualMatch() {
    const p1 = document.getElementById('p1Input').value.trim();
    const p2 = document.getElementById('p2Input').value.trim();
    if (!p1 || !p2) { toast('Enter both usernames', 'error'); return; }
    if (p1 === p2)  { toast('Players must be different', 'error'); return; }
    fixtures.push({ home: p1, away: p2, id: Date.now() });
    saveData();
    renderAll();
    document.getElementById('p1Input').value = '';
    document.getElementById('p2Input').value = '';
    toast(`Fixture added: ${p1} vs ${p2}`, 'success');
}

// ---- DATALIST ----
function updatePlayerDatalist() {
    ['player-list-p1', 'player-list-p2'].forEach(id => {
        const dl = document.getElementById(id);
        if (!dl) return;
        dl.innerHTML = '';
        players.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.username;
            dl.appendChild(opt);
        });
    });
}

function updatePlayerCount() {
    const el = document.getElementById('player-count');
    if (el) el.textContent = players.length;
}

// ---- IMAGE EXPORT: FIXTURES ----
function downloadFixtureImage() {
    if (fixtures.length === 0) { toast('No fixtures to export', 'error'); return; }

    const list = document.getElementById('poster-fixture-list');
    list.innerHTML = '';

    fixtures.forEach(f => {
        const row = document.createElement('div');
        row.className = 'poster-match-row';
        row.innerHTML = `
            <div class="poster-match-home">${f.home}</div>
            <div class="poster-match-vs">VS</div>
            <div class="poster-match-away">${f.away}</div>
        `;
        list.appendChild(row);
    });

    captureElement('fixture-capture-area', `Mettlestate_Fixtures_${dateStamp()}.png`, 'Fixtures image downloaded!');
}

// ---- IMAGE EXPORT: LEADERBOARD ----
function downloadLeaderboardImage() {
    if (players.length === 0) { toast('No players to export', 'error'); return; }

    const sorted = [...players].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return ((b.gf||0)-(b.ga||0)) - ((a.gf||0)-(a.ga||0));
    });

    const container = document.getElementById('poster-lb-table');
    container.innerHTML = '';

    // Header row
    const header = document.createElement('div');
    header.className = 'poster-lb-header';
    header.innerHTML = `<div>#</div><div>PLAYER</div><div>P</div><div>W</div><div>D</div><div>L</div><div>PTS</div>`;
    container.appendChild(header);

    sorted.forEach((p, i) => {
        const rank = i + 1;
        const posClass = rank === 1 ? 'poster-lb-pos-1' : rank === 2 ? 'poster-lb-pos-2' : rank === 3 ? 'poster-lb-pos-3' : '';
        const row = document.createElement('div');
        row.className = 'poster-lb-row';
        row.innerHTML = `
            <div class="${posClass}">${rank}</div>
            <div>${p.username}</div>
            <div>${p.played||0}</div>
            <div>${p.wins||0}</div>
            <div>${p.draws||0}</div>
            <div>${p.losses||0}</div>
            <div class="poster-lb-pts">${p.points||0}</div>
        `;
        container.appendChild(row);
    });

    captureElement('lb-capture-area', `Mettlestate_Standings_${dateStamp()}.png`, 'Standings image downloaded!');
}

function downloadRulesImage() {
    // Clone the live rules content into the poster
    const liveRules = document.getElementById('rules-content');
    const posterRules = document.getElementById('poster-rules-content');
    posterRules.innerHTML = liveRules.innerHTML;
    // Make rule text visible on dark poster
    posterRules.querySelectorAll('*').forEach(el => {
        el.style.color = el.style.color || '';
    });
    captureElement('rules-capture-area', `Mettlestate_Rules_Season1.png`, 'Rules image downloaded!');
}

// ---- SHARED CAPTURE HELPER ----
// Temporarily makes the element fully visible, captures it, then hides it again.
function captureElement(elementId, filename, successMsg) {
    const el = document.getElementById(elementId);

    // Reveal: move on-screen and make visible
    el.style.position   = 'fixed';
    el.style.top        = '0';
    el.style.left       = '0';
    el.style.visibility = 'visible';
    el.style.zIndex     = '-1';   // behind everything so user doesn't see it flash

    // Give browser a frame to paint, then capture
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            html2canvas(el, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#0A0A0C',
                logging: false,
                onclone: (doc) => {
                    // Ensure the cloned element is fully visible in the clone doc
                    const cloned = doc.getElementById(elementId);
                    if (cloned) {
                        cloned.style.visibility = 'visible';
                        cloned.style.position   = 'static';
                        cloned.style.left       = '0';
                        cloned.style.top        = '0';
                        cloned.style.zIndex     = '1';
                    }
                }
            }).then(canvas => {
                // Hide again
                el.style.position   = 'absolute';
                el.style.top        = '0';
                el.style.left       = '-9999px';
                el.style.visibility = 'hidden';
                el.style.zIndex     = '-1';

                const link = document.createElement('a');
                link.download = filename;
                link.href = canvas.toDataURL('image/png');
                link.click();
                toast(successMsg, 'success');
            }).catch(err => {
                console.error('html2canvas error:', err);
                el.style.position   = 'absolute';
                el.style.left       = '-9999px';
                el.style.visibility = 'hidden';
                toast('Export failed. Try again.', 'error');
            });
        });
    });
}

// ---- DATA UTILS ----
function saveData() {
    localStorage.setItem('eafc_players',  JSON.stringify(players));
    localStorage.setItem('eafc_fixtures', JSON.stringify(fixtures));
    localStorage.setItem('eafc_results',  JSON.stringify(results));
}

function exportData() {
    const blob = new Blob([JSON.stringify({ players, fixtures, results }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `Mettlestate_Backup_${dateStamp()}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    toast('Backup exported!', 'success');
}

function clearData() {
    if (!confirm('⚠️ This will DELETE all players, fixtures, and results. Are you absolutely sure?')) return;
    localStorage.clear();
    players = []; fixtures = []; results = [];
    renderAll();
    toast('League reset.', 'success');
}

// ---- MODAL ----
function openModal(html) {
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('open');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
}

// ---- TOAST ----
function toast(msg, type = 'success') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = `toast ${type} show`;
    clearTimeout(el._timeout);
    el._timeout = setTimeout(() => el.classList.remove('show'), 3000);
}

// ---- HELPERS ----
function truncate(str, n) {
    return str.length > n ? str.slice(0, n) + '…' : str;
}

function dateStamp() {
    return new Date().toLocaleDateString('en-ZA').replace(/\//g, '-');
}