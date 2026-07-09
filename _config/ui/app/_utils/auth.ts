import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';

// Persist the GitHub OAuth access token on the session so /api/submit can open the PR AS the signed-in
// user (from their own fork). `public_repo` scope covers fork + push + pull request on public repos.
declare module 'next-auth' {
	// biome-ignore lint/style/useNamingConvention: augmenting next-auth's own Session interface
	interface Session {
		accessToken?: string;
	}
}

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
		},
		session({session, token}) {
			session.accessToken = token.accessToken as string | undefined;
			return session;
		}
	}
});
