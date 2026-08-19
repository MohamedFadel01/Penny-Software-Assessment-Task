import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { summaries, users } from '../api/fixtures';

const flush = () => new Promise((r) => setTimeout(r, 0));

const alphaRows = summaries.filter((row) => row.orgCode === 'org-alpha');
const betaRows = summaries.filter((row) => row.orgCode === 'org-beta');

describe('AppComponent', () => {
	async function createApp(): Promise<AppComponent> {
		TestBed.configureTestingModule({
			imports: [AppComponent],
		});
		await TestBed.compileComponents();
		return TestBed.createComponent(AppComponent).componentInstance;
	}

	async function renderApp(): Promise<ComponentFixture<AppComponent>> {
		TestBed.configureTestingModule({
			imports: [AppComponent],
		});
		await TestBed.compileComponents();
		const fixture = TestBed.createComponent(AppComponent);
		fixture.detectChanges();
		await flush();
		fixture.detectChanges();
		return fixture;
	}

	async function switchActingAs(fixture: ComponentFixture<AppComponent>, key: string): Promise<void> {
		const select: HTMLSelectElement = fixture.nativeElement.querySelector('.app-header select');
		select.value = key;
		select.dispatchEvent(new Event('change'));
		fixture.detectChanges();
		await flush(); // reload() recreates the panes
		fixture.detectChanges();
		await flush(); // list load
		fixture.detectChanges();
		await flush(); // detail load
		fixture.detectChanges();
	}

	it('clears the selected CR immediately when switching user so the old id is not reused', async () => {
		const app = await createApp();
		expect(app.selectedId).toBe('CR-1');
		app.switchUser('otherOrg');
		expect(app.session.user).toBe(users.otherOrg);
		expect(app.selectedId).toBeNull();
	});

	it('selects the first CR of the new org after the list loads', async () => {
		const app = await createApp();
		app.switchUser('otherOrg');
		app.onListLoaded(betaRows);
		expect(app.selectedId).toBe('CR-9');
	});

	it('selects the first CR when switching to a viewer in the same org', async () => {
		const app = await createApp();
		app.switchUser('viewer');
		app.onListLoaded(alphaRows);
		expect(app.session.user).toBe(users.viewer);
		expect(app.selectedId).toBe('CR-1');
	});

	it('leaves the selection empty when the new org has no change requests', async () => {
		const app = await createApp();
		app.switchUser('otherOrg');
		app.onListLoaded([]);
		expect(app.selectedId).toBeNull();
	});

	it('keeps the current selection when the list reloads after an action', async () => {
		const app = await createApp();
		app.selectedId = 'CR-2';
		app.onListLoaded(alphaRows);
		expect(app.selectedId).toBe('CR-2');
	});

	it('shows the first CR detail after switching to another org', async () => {
		const fixture = await renderApp();
		await switchActingAs(fixture, 'otherOrg');
		expect(fixture.componentInstance.selectedId).toBe('CR-9');
		expect(fixture.nativeElement.querySelector('.cr-detail__header h2').textContent).toContain('Beta org change');
	});

	it('shows the first CR detail after switching to a viewer in the same org', async () => {
		const fixture = await renderApp();
		await switchActingAs(fixture, 'viewer');
		expect(fixture.componentInstance.selectedId).toBe('CR-1');
		expect(fixture.nativeElement.querySelector('.cr-detail__header h2').textContent).toContain('Add 1 unit of SKU-A');
	});
});
