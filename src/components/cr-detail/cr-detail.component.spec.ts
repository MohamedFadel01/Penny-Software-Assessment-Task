import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrDetailComponent } from './cr-detail.component';
import { SessionService } from '../../session/session.service';
import { CrApiService } from '../../api/cr-api.service';
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

function statusText(fixture: ComponentFixture<CrDetailComponent>): string {
	return fixture.nativeElement.querySelector('.cr-status')?.textContent?.trim() ?? '';
}

function clickApprove(fixture: ComponentFixture<CrDetailComponent>): void {
	fixture.nativeElement.querySelector('.cr-actions__approve').click();
	fixture.detectChanges();
}

function clickReject(fixture: ComponentFixture<CrDetailComponent>): void {
	fixture.nativeElement.querySelector('.cr-actions__reject-btn').click();
	fixture.detectChanges();
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

	it('hides Reject for a read-only viewer on a pending CR', async () => {
		const fixture = await render(users.viewer, 'CR-1');
		expect(fixture.nativeElement.querySelector('.cr-actions__reject')).toBeNull();
		expect(fixture.nativeElement.querySelector('.cr-actions__reject-btn')).toBeNull();
	});

	it('still shows CR data to a read-only viewer', async () => {
		const fixture = await render(users.viewer, 'CR-1');
		expect(fixture.nativeElement.querySelector('.cr-detail__header h2').textContent).toContain('Add 1 unit of SKU-A');
	});

	it('offers Approve and Reject to an approver on a pending CR', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const approveBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.cr-actions__approve');
		expect(approveBtn.disabled).toBe(false);
		expect(fixture.nativeElement.querySelector('.cr-actions__reject')).not.toBeNull();
		const rejectBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.cr-actions__reject-btn');
		expect(rejectBtn).not.toBeNull();
	});

	it.each(['CR-2', 'CR-3'])('does not offer actions to an approver when the CR is not pending (%s)', async (id) => {
		const fixture = await render(users.approver, id);
		const approveBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.cr-actions__approve');
		expect(approveBtn.disabled).toBe(true);
		expect(fixture.nativeElement.querySelector('.cr-actions__reject')).toBeNull();
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

	it('approves a pending CR and refreshes the view', async () => {
		const fixture = await render(users.approver, 'CR-1');
		clickApprove(fixture);
		await flush();
		fixture.detectChanges();
		expect(statusText(fixture)).toBe('APPROVED');
		expect(fixture.nativeElement.querySelector('.cr-actions__approve').disabled).toBe(true);
		expect(fixture.nativeElement.querySelector('.cr-actions__reject')).toBeNull();
		expect(timelineActions(fixture)).toEqual(['CREATE', 'SUBMIT', 'SEND_FOR_APPROVAL', 'APPROVE']);
		expect(fixture.nativeElement.querySelector('.cr-actions__error')).toBeNull();
	});

	it('disables Approve while the request is in flight', async () => {
		const fixture = await render(users.approver, 'CR-1');
		clickApprove(fixture);
		expect(fixture.nativeElement.querySelector('.cr-actions__approve').disabled).toBe(true);
		await flush();
		fixture.detectChanges();
	});

	it('does not send a second Approve while one is in flight', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const approve = jest.spyOn(TestBed.inject(CrApiService), 'approve');
		clickApprove(fixture);
		clickApprove(fixture);
		await flush();
		fixture.detectChanges();
		expect(approve).toHaveBeenCalledTimes(1);
	});

	it('keeps the loaded CR and shows an error when Approve fails', async () => {
		const fixture = await render(users.approver, 'CR-1');
		TestBed.inject(CrApiService).failNext = true;
		clickApprove(fixture);
		await flush();
		fixture.detectChanges();
		expect(statusText(fixture)).toBe('PENDING_APPROVAL');
		expect(fixture.nativeElement.querySelector('.cr-detail__header h2').textContent).toContain('Add 1 unit of SKU-A');
		expect(fixture.nativeElement.querySelector('.cr-detail__error')).toBeNull();
		const error = fixture.nativeElement.querySelector('.cr-actions__error');
		expect(error).not.toBeNull();
		expect(error.textContent).toContain('Network error');
		expect(fixture.nativeElement.querySelector('.cr-actions__approve').disabled).toBe(false);
	});

	it('allows Approve to be retried after a failed request', async () => {
		const fixture = await render(users.approver, 'CR-1');
		TestBed.inject(CrApiService).failNext = true;
		clickApprove(fixture);
		await flush();
		fixture.detectChanges();
		clickApprove(fixture);
		await flush();
		fixture.detectChanges();
		expect(statusText(fixture)).toBe('APPROVED');
		expect(fixture.nativeElement.querySelector('.cr-actions__error')).toBeNull();
	});

	it('rejects a pending CR with a reason and refreshes the view', async () => {
		const fixture = await render(users.approver, 'CR-1');
		fixture.componentInstance.rejectControl.setValue('Price increase is not justified');
		fixture.detectChanges();
		clickReject(fixture);
		await flush();
		fixture.detectChanges();
		expect(statusText(fixture)).toBe('REJECTED');
		expect(fixture.nativeElement.querySelector('.cr-actions__reject')).toBeNull();
		expect(fixture.nativeElement.querySelector('.cr-actions__approve').disabled).toBe(true);
		expect(timelineActions(fixture)).toEqual(['CREATE', 'SUBMIT', 'SEND_FOR_APPROVAL', 'REJECT']);
	});

	it('keeps the loaded CR and shows an error when Reject fails', async () => {
		const fixture = await render(users.approver, 'CR-1');
		fixture.componentInstance.rejectControl.setValue('Price increase is not justified');
		fixture.detectChanges();
		TestBed.inject(CrApiService).failNext = true;
		clickReject(fixture);
		await flush();
		fixture.detectChanges();
		expect(statusText(fixture)).toBe('PENDING_APPROVAL');
		expect(fixture.nativeElement.querySelector('.cr-detail__error')).toBeNull();
		const error = fixture.nativeElement.querySelector('.cr-actions__error');
		expect(error).not.toBeNull();
		expect(error.textContent).toContain('Network error');
		expect(fixture.nativeElement.querySelector('.cr-actions__reject')).not.toBeNull();
	});

	it('emits updated after a successful approve', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const updated = jest.fn();
		fixture.componentInstance.updated.subscribe(updated);
		clickApprove(fixture);
		await flush();
		fixture.detectChanges();
		expect(updated).toHaveBeenCalledTimes(1);
	});

	it('does not emit updated when Approve fails', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const updated = jest.fn();
		fixture.componentInstance.updated.subscribe(updated);
		TestBed.inject(CrApiService).failNext = true;
		clickApprove(fixture);
		await flush();
		fixture.detectChanges();
		expect(updated).not.toHaveBeenCalled();
	});

	it('emits updated after a successful reject', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const updated = jest.fn();
		fixture.componentInstance.updated.subscribe(updated);
		fixture.componentInstance.rejectControl.setValue('Price increase is not justified');
		fixture.detectChanges();
		clickReject(fixture);
		await flush();
		fixture.detectChanges();
		expect(updated).toHaveBeenCalledTimes(1);
	});

	it('disables Reject when the reason is empty', async () => {
		const fixture = await render(users.approver, 'CR-1');
		expect(fixture.nativeElement.querySelector('.cr-actions__reject-btn').disabled).toBe(true);
		expect(fixture.nativeElement.querySelector('.cr-actions__reason-error')).toBeNull();
	});

	it('shows a reason error after the empty field is touched', async () => {
		const fixture = await render(users.approver, 'CR-1');
		fixture.componentInstance.rejectControl.markAsTouched();
		fixture.detectChanges();
		const error = fixture.nativeElement.querySelector('.cr-actions__reason-error');
		expect(error).not.toBeNull();
		expect(error.textContent).toContain('Please enter a reason.');
	});

	it('enables Reject and hides the reason error after a reason is entered', async () => {
		const fixture = await render(users.approver, 'CR-1');
		fixture.componentInstance.rejectControl.markAsTouched();
		fixture.componentInstance.rejectControl.setValue('Price increase is not justified');
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelector('.cr-actions__reason-error')).toBeNull();
		expect(fixture.nativeElement.querySelector('.cr-actions__reject-btn').disabled).toBe(false);
	});

	it('treats a whitespace-only reason as invalid', async () => {
		const fixture = await render(users.approver, 'CR-1');
		fixture.componentInstance.rejectControl.setValue('   ');
		fixture.componentInstance.rejectControl.markAsTouched();
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelector('.cr-actions__reject-btn').disabled).toBe(true);
		expect(fixture.nativeElement.querySelector('.cr-actions__reason-error')).not.toBeNull();
	});

	it('does not call the API when Reject is invoked with an empty reason', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const reject = jest.spyOn(TestBed.inject(CrApiService), 'reject');
		await fixture.componentInstance.reject();
		expect(reject).not.toHaveBeenCalled();
		expect(statusText(fixture)).toBe('PENDING_APPROVAL');
	});
});
