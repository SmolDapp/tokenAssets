# Token Assets Builder

This project is a token assets builder that downloads token logos from specified URLs, converts them to various formats, and organizes them into directories based on the token's chain and address.

## Installation

To get started, clone the repository and install the necessary dependencies:

```sh
git clone <repository-url>
cd tokenAssets/_builder/TS
npm install
```

## Usage

To use the token assets builder, you need to provide a company name using the `--company` argument. The company name should correspond to a directory in the `company` folder that contains a `tokens.ts` file with the token list.

### Running the Builder

```sh
node build-path.js --company <company-name>
```

Replace `<company-name>` with the name of the company you want to build the token assets for.

## Token List

The `tokens.ts` file should export an object with a `tokens` property, which is an array of token objects. Each token object should adhere to the following interface:

```ts
// filepath: tokenAssets/_builder/TS/interfaces/IToken.ts
export interface IToken {
	chainId: number;
	address: string;
	logo: string;
}
```

### Example `tokens.ts` File

```ts
// filepath: tokenAssets/_builder/TS/company/<company-name>/tokens.ts
import {IToken} from '../interfaces/IToken';

export const tokenConfig: IToken[] = {
	tokens: [
		{
			chainId: 1,
			address: '0x1234567890abcdef1234567890abcdef12345678',
			logo: 'https://example.com/logo.png'
		},
		{
			chainId: 56,
			address: '0xabcdef1234567890abcdef1234567890abcdef12',
			logo: 'https://example.com/logo2.png'
		}
	]
};
```

## Output

The builder will create a `tokens` directory at the root level, with subdirectories for each chain and address. The logos will be saved in the following formats:

-   `logo.png`: Original logo in PNG format
-   `logo-32.png`: Resized logo (32x32)
-   `logo-128.png`: Resized logo (128x128)
-   `logo.svg`: Converted logo in SVG format

### Example Directory Structure

```
tokenAssets/
├── _builder/
│   ├── TS/
│   │   ├── build-path.ts
│   │   ├── interfaces/
│   │   │   └── IToken.ts
│   │   ├── company/
│   │   │   └── <company-name>/
│   │   │       └── tokens.ts
│   │   └── README.md
├── tokens/
│   ├── 1/
│   │   └── 0x1234567890abcdef1234567890abcdef12345678/
│   │       ├── logo.png
│   │       ├── logo-32.png
│   │       ├── logo-128.png
│   │       └── logo.svg
│   ├── 56/
│   │   └── 0xabcdef1234567890abcdef1234567890abcdef12/
│   │       ├── logo.png
│   │       ├── logo-32.png
│   │       ├── logo-128.png
│   │       └── logo.svg
```

#### P.S. After generating better to check all new files, and replace manually broken if exists.

This `README.md` file provides a comprehensive guide for developers on how to use the token assets builder, including installation, usage, and the expected structure of the token list.
