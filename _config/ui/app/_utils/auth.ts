import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';

// The GitHub OAuth access token is kept ONLY in the encrypted JWT (server-side). It is never copied onto
// the session, so /api/auth/session never serves it to the browser. /api/submit reads it back from the
// JWT with getToken(). `public_repo` scope covers fork + push + pull request on public repos.
export const {handlers, auth, signIn, signOut} = NextAuth({
	trustHost: true,
	providers: [
		GitHub({
			clientId: process.env.AUTH_GITHUB_ID,
			clientSecret: process.env.AUTH_GITHUB_SECRET,
			authorization: {params: {scope: 'read:user public_repo'}}
		})
	],
	callbacks: {
		jwt({token, account}) {
			if (account?.access_token) {
				token.accessToken = account.access_token;
			}
			return token;
		}
	}
});
