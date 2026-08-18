import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrListComponent } from './cr-list.component';
import { SessionService } from '../../session/session.service';
import { CrApiService } from '../../api/cr-api.service';
import { users } from '../../api/fixtures';
import { CrStatus, ReqUser } from '../../models/cr.models';

const flush = () => new Promise((r) => setTimeout(r, 0));

async function createList(user: ReqUser, options?: { failNext?: boolean }): Promise<ComponentFixture<CrListComponent>> {
	TestBed.configureTestingModule({
		imports: [CrListComponent],
		providers: [{ provide: SessionService, useValue: { user } }],
	});
	await TestBed.compileComponents();
	if (options?.failNext) {
		TestBed.inject(CrApiService).failNext = true;
	}
	return TestBed.createComponent(CrListComponent);
}

async function render(user: ReqUser): Promise<ComponentFixture<CrListComponent>> {
	const fixture = await createList(user);
	fixture.detectChanges(); // ngOnInit -> load()
	await flush(); // let the mock API resolve
	fixture.detectChanges(); // render the loaded/empty state
	return fixture;
}

function rowIds(fixture: ComponentFixture<CrListComponent>): string[] {
	return Array.from(fixture.nativeElement.querySelectorAll('.cr-list__row') as NodeListOf<HTMLTableRowElement>).map(
		(row) => row.querySelector('td')?.textContent?.trim() ?? '',
	);
}

function setStatusFilter(fixture: ComponentFixture<CrListComponent>, value: CrStatus | 'ALL'): void {
	const select: HTMLSelectElement = fixture.nativeElement.querySelector('.cr-list__filter');
	select.value = value;
	select.dispatchEvent(new Event('change'));
	fixture.detectChanges();
}

describe('CrListComponent', () => {
	it('renders a row per change request in the user org', async () => {
		const fixture = await render(users.approver);
		expect(fixture.nativeElement.querySelectorAll('.cr-list__row').length).toBe(3); // org-alpha: CR-1, CR-2, CR-3
	});

	it('shows the empty state when the org has no change requests', async () => {
		const fixture = await render({ id: 'x', orgCode: 'org-empty', policies: ['cr_r_o'] });
		expect(fixture.nativeElement.querySelector('.cr-list__empty')).not.toBeNull();
		expect(fixture.nativeElement.querySelector('.cr-list__table')).toBeNull();
	});

	it('shows loading before the list resolves', async () => {
		const fixture = await createList(users.approver);
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelector('.cr-list__loading')).not.toBeNull();
		expect(fixture.nativeElement.querySelector('.cr-list__table')).toBeNull();
		await flush();
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelector('.cr-list__loading')).toBeNull();
		expect(fixture.nativeElement.querySelector('.cr-list__table')).not.toBeNull();
	});

	it('shows an error when the list request fails', async () => {
		const fixture = await createList(users.approver, { failNext: true });
		fixture.detectChanges();
		await flush();
		fixture.detectChanges();
		const error = fixture.nativeElement.querySelector('.cr-list__error');
		expect(error).not.toBeNull();
		expect(error.textContent).toContain('Network error');
		expect(fixture.nativeElement.querySelector('.cr-list__table')).toBeNull();
	});

	it('retries after a failed list request', async () => {
		const fixture = await createList(users.approver, { failNext: true });
		fixture.detectChanges();
		await flush();
		fixture.detectChanges();
		fixture.nativeElement.querySelector('.cr-list__error button').click();
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelector('.cr-list__loading')).not.toBeNull();
		await flush();
		fixture.detectChanges();
		expect(rowIds(fixture)).toEqual(['CR-1', 'CR-2', 'CR-3']);
	});

	it('shows every org row when the status filter is ALL', async () => {
		const fixture = await render(users.approver);
		setStatusFilter(fixture, 'DRAFT');
		setStatusFilter(fixture, 'ALL');
		expect(rowIds(fixture)).toEqual(['CR-1', 'CR-2', 'CR-3']);
	});

	it.each<[CrStatus, string[]]>([
		['PENDING_APPROVAL', ['CR-1']],
		['APPLIED', ['CR-2']],
		['DRAFT', ['CR-3']],
	])('narrows the table to %s rows', async (status, expectedIds) => {
		const fixture = await render(users.approver);
		setStatusFilter(fixture, status);
		expect(rowIds(fixture)).toEqual(expectedIds);
		expect(fixture.nativeElement.querySelector('.cr-list__table')).not.toBeNull();
		expect(fixture.nativeElement.querySelector('.cr-list__empty')).toBeNull();
	});

	it.each<CrStatus>(['SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED'])(
		'shows an empty table (not the org-empty message) when no rows match %s',
		async (status) => {
			const fixture = await render(users.approver);
			setStatusFilter(fixture, status);
			expect(rowIds(fixture)).toEqual([]);
			expect(fixture.nativeElement.querySelector('.cr-list__table')).not.toBeNull();
			expect(fixture.nativeElement.querySelector('.cr-list__empty')).toBeNull();
		},
	);
});
