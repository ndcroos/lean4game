import * as React from 'react';
import { useState } from 'react';
import { Typography } from '@mui/material'
import { Markdown } from '../utils'
import { Trans, useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { selectLevel } from '../../state/progress'
import { useGetGameInfoQuery } from '../../state/api'
import { GameIdContext, ProofContext } from '../../state/context'

import axios from 'axios';

/** Pop-up that is displaying when opening the 'Ask Zulip' button.
 *
 * 
 * 
 */
export function AskZulipQuestionPopup () {
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(null);
	const [error, setError] = useState(null);
	
	const { t } = useTranslation()
	const { gameId } = React.useContext(GameIdContext)
	const gameIdShort = gameId.replace("g/local/", "") // If local, remove the first part of the string
	const gameInfo = useGetGameInfoQuery({game: gameId})
	const level = useSelector(selectLevel(gameId))
	
	const { proofState } = React.useContext(ProofContext)
	console.log("level")
	console.log(level)
	console.log("proofState")
	console.log(proofState)
    const title = `Issue with level ${level}`
    const body = `Describe the issue with level ${level} here: \n\n${proofState}`
	
	const { zulipDomain, zulipEmail, zulipApiKey, stream, topic, questionContent } = this.props;
	
    const createZulipQuestion = async () => {
		const url = `https://${zulipDomain}/api/v1/messages`;
		
		// todo
		setLoading(true);
		setSuccess(null);
		setError(null);

		try {
		  const response = await axios.post(
			url,
			{
			  type: 'stream',
			  to: stream,
			  subject: topic,
			  content: questionContent,
			},
			{
			  auth: {
				username: zulipEmail,
				password: zulipApiKey,
			  },
			}
		  );

		  if (response.status === 200) {
			setSuccess('Question posted successfully!');
		  } else {
			setError('Failed to post question.');
		  }
		} catch (error) {
		  setError(`Error: ${error.message}`);
		} finally {
		  setLoading(false);
		}
	};

	return (
		<div>
		  <button onClick={createZulipQuestion} disabled={loading}>
			{loading ? 'Posting...' : 'Post Question'}
		  </button>
		  {success && <p style={{ color: 'green' }}>{success}</p>}
		  {error && <p style={{ color: 'red' }}>{error}</p>}
		</div>
	);
}
