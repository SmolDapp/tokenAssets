import GrumpyIcon from '@icons/grumpy.svg';
import HappyIcon from '@icons/happy.svg';

import type {ReactElement} from 'react';

type TProps = {
	state: 'success' | 'error';
	message: ReactElement;
	action?: ReactElement;
};

export const TxResult = ({state, message, action}: TProps): ReactElement => {
	return (
		<div
			className={
				'flex size-full min-h-[400px] flex-col items-center justify-center border border-1 border-separator bg-separator p-16'
			}>
			<div className={'flex flex-col gap-6'}>
				<div>
					{state === 'success' ? <HappyIcon className={'size-24'} /> : <GrumpyIcon className={'size-24'} />}
				</div>

				<div className={'flex w-full max-w-[600px] flex-col items-start gap-4 sm:flex-row sm:gap-8'}>
					<div className={'max-w-[400px] flex-1'}>{message}</div>
					{action && <div className={'max-w-[400px] whitespace-pre break-all'}>{action}</div>}
				</div>
			</div>
		</div>
	);
};
