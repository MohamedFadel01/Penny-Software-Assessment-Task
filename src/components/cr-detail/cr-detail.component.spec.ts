import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrDetailComponent } from './cr-detail.component';
import { SessionService } from '../../session/session.service';
import { users } from '../../api/fixtures';
import { ReqUser } from '../../models/cr.models';

const flush = () => new Promise((r) => setTimeout(r, 0));

async function render(user: ReqUser, id: string): Promise<ComponentFixture<CrDetailComponent>> {
	TestBed.configureTestingModule({
		imports: [CrDetailComponent],
		providers: [{ provide: SessionService, useValue: { user } }],
	});
	await TestBed.compileComponents();
	const fixture = TestBed.createComponent(CrDetailComponent);
	fixture.componentInstance.id = id;
	fixture.detectChanges(); // ngOnInit -> load()
	await flush(); // let the mock API resolve
	fixture.detectChanges(); // render the loaded state
	return fixture;
}

function timelineActions(fixture: ComponentFixture<CrDetailComponent>): string[] {
	return Array.from(fixture.nativeElement.querySelectorAll('.cr-timeline__action') as NodeListOf<HTMLElement>).map(
		(el) => el.textContent?.trim() ?? '',
	);
}

function timelineTimes(fixture: ComponentFixture<CrDetailComponent>): string[] {
	return Array.from(fixture.nativeElement.querySelectorAll('.cr-timeline__at') as NodeListOf<HTMLElement>).map(
		(el) => el.textContent?.trim() ?? '',
	);
}

describe('CrDetailComponent', () => {
	it('loads and renders the change request title', async () => {
		const fixture = await render(users.approver, 'CR-1');
		expect(fixture.nativeElement.querySelector('.cr-detail__header h2').textContent).toContain('Add 1 unit of SKU-A');
	});

	it('disables Approve for a read-only viewer on a pending CR', async () => {
		const fixture = await render(users.viewer, 'CR-1'); // viewer: cr_r_o only; CR-1 is PENDING_APPROVAL
		const approveBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.cr-actions__approve');
		expect(approveBtn.disabled).toBe(true);
	});

	it('renders CR-1 timeline oldest-first', async () => {
		const fixture = await render(users.approver, 'CR-1');
		expect(timelineActions(fixture)).toEqual(['CREATE', 'SUBMIT', 'SEND_FOR_APPROVAL']);
		expect(timelineTimes(fixture)).toEqual([
			'2026-03-02T09:00:00.000Z',
			'2026-03-02T09:30:00.000Z',
			'2026-03-02T10:00:00.000Z',
		]);
	});

	it('keeps CR-2 timeline oldest-first', async () => {
		const fixture = await render(users.approver, 'CR-2');
		expect(timelineActions(fixture)).toEqual(['CREATE', 'APPROVE', 'APPLY']);
	});

	it('renders a single-entry timeline for CR-3', async () => {
		const fixture = await render(users.approver, 'CR-3');
		expect(timelineActions(fixture)).toEqual(['CREATE']);
	});
});
