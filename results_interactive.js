// Interactive Features for Results Page
// Handles: Sorting, Filtering, Expandable Details, Comparison

class ResultsManager {
    constructor() {
        this.universities = [];
        this.selectedForComparison = new Set();
        this.currentSort = { column: null, direction: 'asc' };
        this.activeFilters = { classification: new Set(), country: null };
        this.expandedRow = null;

        this.init();
    }

    init() {
        this.collectUniversityData();
        this.setupSorting();
        this.setupFiltering();
        this.setupExpandableRows();
        this.setupComparison();
        this.animateProgressBars();
        this.setupShowMore();
    }

    collectUniversityData() {
        const rows = document.querySelectorAll('tbody .university-row');
        rows.forEach((row, index) => {
            const cells = row.querySelectorAll('td');

            // Column structure: University (0), Match Score (1), Analysis (2), Admission Rate (3), Tuition (4), Majors (5), Country (6)
            const nameEl = cells[0]?.querySelector('strong');
            const badgeEl = cells[0]?.querySelector('.badge, [class*="badge"]');
            const fillEl = cells[1]?.querySelector('.fill');

            if (!nameEl || !fillEl) {
                console.warn('Skipping row - missing required elements:', index);
                return;
            }

            const data = {
                index: index,
                row: row,
                name: nameEl.textContent.trim(),
                classification: badgeEl ? badgeEl.textContent.trim() : 'Unknown',
                matchScore: parseFloat(fillEl.textContent.trim()),
                admissionRate: cells[3]?.textContent.trim() || 'N/A',
                tuition: cells[4]?.textContent.replace(/[$,]/g, '').trim() || '0',
                majors: cells[5]?.textContent.trim() || 'N/A',
                country: cells[6]?.textContent.trim() || 'N/A',
                components: {
                    grade: parseFloat(row.dataset.grade || 0),
                    budget: parseFloat(row.dataset.budget || 0),
                    interest: parseFloat(row.dataset.interest || 0),
                    country: parseFloat(row.dataset.country || 0)
                }
            };

            this.universities.push(data);
        });

        console.log('Collected university data:', this.universities.length, 'universities');
    }

    setupSorting() {
        const headers = document.querySelectorAll('thead th.sortable');
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.dataset.sort;
                this.sortTable(column);
            });
        });
    }

    sortTable(column) {
        // Toggle direction if same column
        if (this.currentSort.column === column) {
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.column = column;
            this.currentSort.direction = 'asc';
        }

        // Update header indicators
        document.querySelectorAll('thead th.sortable').forEach(th => {
            th.classList.remove('asc', 'desc');
        });
        const activeHeader = document.querySelector(`thead th[data-sort="${column}"]`);
        activeHeader.classList.add(this.currentSort.direction);

        // Sort universities array
        this.universities.sort((a, b) => {
            let valA, valB;

            switch (column) {
                case 'match':
                    valA = a.matchScore;
                    valB = b.matchScore;
                    break;
                case 'admission':
                    valA = parseFloat(a.admissionRate) || 0;
                    valB = parseFloat(b.admissionRate) || 0;
                    break;
                case 'tuition':
                    valA = parseFloat(a.tuition) || 0;
                    valB = parseFloat(b.tuition) || 0;
                    break;
                case 'country':
                    valA = a.country;
                    valB = b.country;
                    return this.currentSort.direction === 'asc' ?
                        valA.localeCompare(valB) : valB.localeCompare(valA);
                default:
                    return 0;
            }

            return this.currentSort.direction === 'asc' ? valA - valB : valB - valA;
        });

        // Reorder DOM
        const tbody = document.querySelector('tbody');
        this.universities.forEach((uni, index) => {
            // Move main row
            tbody.appendChild(uni.row);
            // Move detail row if it exists
            const detailRow = uni.row.nextElementSibling;
            if (detailRow && detailRow.classList.contains('detail-row')) {
                tbody.appendChild(detailRow);
            }
        });
    }

    setupFiltering() {
        // Classification filters - start with all active
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            // Initialize all filters as active
            const classification = btn.dataset.filter;
            btn.classList.add('active');
            this.activeFilters.classification.add(classification);

            btn.addEventListener('click', () => {
                btn.classList.toggle('active');

                if (this.activeFilters.classification.has(classification)) {
                    this.activeFilters.classification.delete(classification);
                } else {
                    this.activeFilters.classification.add(classification);
                }

                this.applyFilters();
            });
        });

        // Country filter
        const countrySelect = document.getElementById('countryFilter');
        if (countrySelect) {
            // Initialize as null (show all) on page load
            this.activeFilters.country = null;

            countrySelect.addEventListener('change', (e) => {
                const value = e.target.value;
                this.activeFilters.country = (value === 'all' || !value) ? null : value;
                this.applyFilters();
            });
        }
    }

    applyFilters() {
        this.universities.forEach(uni => {
            let show = true;

            // Classification filter
            if (this.activeFilters.classification.size > 0) {
                if (!this.activeFilters.classification.has(uni.classification)) {
                    show = false;
                }
            }

            // Country filter
            if (this.activeFilters.country && uni.country !== this.activeFilters.country) {
                show = false;
            }

            // Apply visibility
            if (show) {
                uni.row.classList.remove('filtered-out');
                uni.row.classList.add('fade-in');
                const detailRow = uni.row.nextElementSibling;
                if (detailRow && detailRow.classList.contains('detail-row')) {
                    detailRow.classList.remove('filtered-out');
                }
            } else {
                uni.row.classList.add('filtered-out');
                const detailRow = uni.row.nextElementSibling;
                if (detailRow && detailRow.classList.contains('detail-row')) {
                    detailRow.classList.add('filtered-out');
                    detailRow.classList.remove('active');
                }
            }
        });
    }

    setupExpandableRows() {
        this.universities.forEach((uni, index) => {
            // Create a modal overlay for the detail chart
            const modal = document.createElement('div');
            modal.classList.add('detail-modal');
            modal.id = `detail-modal-${index}`;
            modal.innerHTML = `
                <div class="detail-modal-overlay"></div>
                <div class="detail-modal-content">
                    <div class="detail-modal-header">
                        <h3>${uni.name}</h3>
                        <button class="detail-modal-close" data-index="${index}">×</button>
                    </div>
                    <div class="detail-modal-body">
                        <div class="detail-modal-chart">
                            <h4>Score Breakdown</h4>
                            <canvas id="detail-chart-${index}" width="400" height="400"></canvas>
                        </div>
                        <div class="detail-modal-stats">
                            <h4>University Details</h4>
                            <div class="detail-stats">
                                <div class="stat-item">
                                    <div class="stat-label">Grade Match</div>
                                    <div class="stat-value">${uni.components.grade.toFixed(1)}/100</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-label">Budget Match</div>
                                    <div class="stat-value">${uni.components.budget.toFixed(1)}/100</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-label">Interest Match</div>
                                    <div class="stat-value">${uni.components.interest.toFixed(1)}/100</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-label">Country Match</div>
                                    <div class="stat-value">${uni.components.country.toFixed(1)}/100</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Add click handler to main row
            uni.row.addEventListener('click', (e) => {
                // Don't trigger if clicking checkbox
                if (e.target.type === 'checkbox') return;

                this.toggleDetailModal(index, uni.components);
            });

            // Close button handler
            const closeBtn = modal.querySelector('.detail-modal-close');
            closeBtn.addEventListener('click', () => {
                this.toggleDetailModal(index, null);
            });

            // Click overlay to close
            const overlay = modal.querySelector('.detail-modal-overlay');
            overlay.addEventListener('click', () => {
                this.toggleDetailModal(index, null);
            });
        });
    }

    toggleDetailModal(index, components) {
        const modal = document.getElementById(`detail-modal-${index}`);
        if (!modal) return;

        const isVisible = modal.classList.contains('active');
        
        if (isVisible) {
            modal.classList.remove('active');
        } else {
            // Close any other open modals
            document.querySelectorAll('.detail-modal.active').forEach(m => {
                m.classList.remove('active');
            });
            
            modal.classList.add('active');
            setTimeout(() => {
                this.drawDetailChart(`detail-chart-${index}`, components);
            }, 100);
        }
    }

    drawDetailChart(canvasId, components) {
        const data = {
            labels: ['Grade', 'Budget', 'Interest', 'Country'],
            values: [components.grade, components.budget, components.interest, components.country]
        };

        const style = getComputedStyle(document.body);
        const brandColor = style.getPropertyValue('--brand-blue').trim() || '#0F6393';

        new RadarChart(canvasId, data, {
            lineColor: brandColor,
            fillColor: 'rgba(15, 99, 147, 0.15)',
            max: 100,
            font: '14px Arial',
            textColor: style.getPropertyValue('--text').trim() || '#222'
        }).draw();
    }

    setupComparison() {
        // Create comparison bar
        const compareBar = document.createElement('div');
        compareBar.classList.add('compare-bar');
        compareBar.id = 'compareBar';
        compareBar.innerHTML = `
            <span id="compareCount">0 selected</span>
            <button id="compareBtn">Compare Universities</button>
            <button id="clearCompareBtn" style="background: transparent; color: white; border: 2px solid white;">Clear</button>
        `;
        document.body.appendChild(compareBar);

        // Create modal
        const modal = document.createElement('div');
        modal.classList.add('modal-overlay');
        modal.id = 'comparisonModal';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close" id="closeModal">×</button>
                <h2 style="color: var(--brand-blue); margin: 0 0 16px 0;">University Comparison</h2>
                <div id="comparisonContent"></div>
            </div>
        `;
        document.body.appendChild(modal);

        // Add checkboxes to table
        const headerRow = document.querySelector('thead tr');
        const checkboxHeader = document.createElement('th');
        checkboxHeader.innerHTML = 'Compare';
        checkboxHeader.style.width = '80px';
        headerRow.insertBefore(checkboxHeader, headerRow.firstChild);

        this.universities.forEach(uni => {
            const checkboxCell = document.createElement('td');
            checkboxCell.innerHTML = `<input type="checkbox" class="compare-checkbox" data-index="${uni.index}">`;
            uni.row.insertBefore(checkboxCell, uni.row.firstChild);

            const checkbox = checkboxCell.querySelector('input');
            checkbox.addEventListener('change', (e) => {
                this.handleCompareSelection(uni, e.target.checked);
            });
        });

        // Button handlers
        document.getElementById('compareBtn').addEventListener('click', () => this.showComparison());
        document.getElementById('clearCompareBtn').addEventListener('click', () => this.clearComparison());
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal();
        });
    }

    handleCompareSelection(uni, checked) {
        if (checked) {
            if (this.selectedForComparison.size >= 3) {
                alert('You can compare up to 3 universities at a time.');
                event.target.checked = false;
                return;
            }
            this.selectedForComparison.add(uni);
            uni.row.classList.add('comparing');
        } else {
            this.selectedForComparison.delete(uni);
            uni.row.classList.remove('comparing');
        }

        this.updateCompareBar();
    }

    updateCompareBar() {
        const count = this.selectedForComparison.size;
        const compareBar = document.getElementById('compareBar');
        const countSpan = document.getElementById('compareCount');

        countSpan.textContent = `${count} selected`;

        if (count >= 2) {
            compareBar.classList.add('active');
        } else {
            compareBar.classList.remove('active');
        }
    }

    showComparison() {
        const modal = document.getElementById('comparisonModal');
        const content = document.getElementById('comparisonContent');

        const selected = Array.from(this.selectedForComparison);

        let html = '<div class="comparison-grid">';
        selected.forEach((uni, idx) => {
            html += `
                <div class="comparison-card">
                    <h3>${uni.name}</h3>
                    <div style="text-align: center; margin: 20px 0;">
                        <canvas id="compare-chart-${idx}" width="180" height="180"></canvas>
                    </div>
                    <div class="detail-stats">
                        <div class="stat-item">
                            <div class="stat-label">Match Score</div>
                            <div class="stat-value">${uni.matchScore}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Classification</div>
                            <div class="stat-value">${uni.classification}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Admission Rate</div>
                            <div class="stat-value">${uni.admissionRate}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Tuition</div>
                            <div class="stat-value">$${parseFloat(uni.tuition).toLocaleString()}</div>
                        </div>
                        <div class="stat-item" style="grid-column: 1 / -1;">
                            <div class="stat-label">Country</div>
                            <div class="stat-value">${uni.country}</div>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';

        content.innerHTML = html;
        modal.classList.add('active');

        // Draw charts
        setTimeout(() => {
            selected.forEach((uni, idx) => {
                this.drawDetailChart(`compare-chart-${idx}`, uni.components);
            });
        }, 100);
    }

    closeModal() {
        document.getElementById('comparisonModal').classList.remove('active');
    }

    clearComparison() {
        this.selectedForComparison.forEach(uni => {
            uni.row.classList.remove('comparing');
            const checkbox = uni.row.querySelector('.compare-checkbox');
            if (checkbox) checkbox.checked = false;
        });
        this.selectedForComparison.clear();
        this.updateCompareBar();
    }

    animateProgressBars() {
        // Animate the match score progress bars
        setTimeout(() => {
            document.querySelectorAll('.match-bar .fill').forEach(fill => {
                const width = fill.textContent;
                fill.style.width = `${width}%`;

                // Color based on score
                const score = parseFloat(width);
                if (score >= 80) fill.classList.add('high');
                else if (score >= 60) fill.classList.add('med');
                else if (score >= 40) fill.classList.add('low');
                else fill.classList.add('verylow');
            });
        }, 200);
    }

    setupShowMore() {
        const showMoreBtn = document.getElementById('showMoreBtn');
        if (!showMoreBtn) return;

        // Store visible count in data attribute to persist across clicks
        let visibleCount = parseInt(showMoreBtn.dataset.visible || 10);

        const handleShowMore = () => {
            const rows = document.querySelectorAll('.university-row');
            const rowsToShow = Math.min(visibleCount + 10, rows.length);
            
            // Show next 10 rows
            for (let i = visibleCount; i < rowsToShow; i++) {
                rows[i].style.display = '';
                // Re-setup expandable rows and modal for newly visible rows
                const uni = this.universities[i];
                if (uni) {
                    this.setupModalForRow(uni, i);
                }
            }

            visibleCount = rowsToShow;
            showMoreBtn.dataset.visible = visibleCount;

            // Hide button if all rows are visible
            if (visibleCount >= rows.length) {
                showMoreBtn.style.display = 'none';
            }

            // Animate progress bars for newly visible rows
            setTimeout(() => {
                this.animateProgressBars();
            }, 100);
        };

        showMoreBtn.addEventListener('click', handleShowMore);
    }

    setupModalForRow(uni, index) {
        // Find the row in the DOM
        const rows = document.querySelectorAll('.university-row');
        const row = rows[index];
        if (!row) return;

        const indicator = row.querySelector('.analysis-indicator');
        if (!indicator || indicator._modalSetup) return; // Already setup

        // Create modal for this row
        const modal = document.createElement('div');
        modal.classList.add('detail-modal');
        modal.id = `detail-modal-${index}`;
        modal.innerHTML = `
            <div class="detail-modal-overlay"></div>
            <div class="detail-modal-content">
                <div class="detail-modal-header">
                    <h3>${uni.name}</h3>
                    <button class="detail-modal-close" style="background: none; border: none; font-size: 24px; cursor: pointer;">×</button>
                </div>
                <div class="detail-modal-body">
                    <div class="detail-modal-chart">
                        <h4>Score Breakdown</h4>
                        <canvas id="detail-chart-${index}" width="400" height="400"></canvas>
                    </div>
                    <div class="detail-modal-stats">
                        <h4>University Details</h4>
                        <div class="detail-stats">
                            <div class="stat-item">
                                <div class="stat-label">Grade Match</div>
                                <div class="stat-value">${uni.components.grade.toFixed(1)}/100</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-label">Budget Match</div>
                                <div class="stat-value">${uni.components.budget.toFixed(1)}/100</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-label">Interest Match</div>
                                <div class="stat-value">${uni.components.interest.toFixed(1)}/100</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-label">Country Match</div>
                                <div class="stat-value">${uni.components.country.toFixed(1)}/100</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Add click handler for indicator
        indicator.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDetailModal(index, uni.components);
        });

        // Close button handler
        const closeBtn = modal.querySelector('.detail-modal-close');
        closeBtn.addEventListener('click', () => {
            this.toggleDetailModal(index, null);
        });

        // Click overlay to close
        const overlay = modal.querySelector('.detail-modal-overlay');
        overlay.addEventListener('click', () => {
            this.toggleDetailModal(index, null);
        });

        indicator._modalSetup = true;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ResultsManager();
});
