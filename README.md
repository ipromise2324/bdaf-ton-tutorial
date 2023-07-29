# bdaf_code_tutorial
## Description
This FunC contract provides a simple treasury functionality. It includes the following features:

- `Deposit`: Allows any address to deposit funds into the contract. The deposited funds are added to the contract's balance.
- `Withdraw`: Allows the owner of the contract to withdraw funds. The amount to be withdrawn is specified in the function call. The function checks if the contract has enough balance before proceeding with the withdrawal.
- `Change Owner`: Allows the current owner of the contract to transfer ownership to another address. The new owner's address is specified in the function call.
- `Transfer Message to Owner`: Allows any address to send a message to the owner of the contract. The message is included in the function call.
- `Self-Destruct`: Allows the owner of the contract to self-destruct the contract. When the contract is self-destructed, all remaining funds are sent to the owner, and the contract is deactivated.
## Test
A comprehensive suite of tests is included to ensure the contract's functionality and correctness. These tests cover all functions of the contract and check for both successful and unsuccessful function calls. 
## Project structure

-   `contracts` - source code of all the smart contracts of the project and their dependencies.
-   `wrappers` - wrapper classes (implementing `Contract` from ton-core) for the contracts, including any [de]serialization primitives and compilation functions.
-   `tests` - tests for the contracts.
-   `scripts` - scripts used by the project, mainly the deployment scripts.

## How to use

### Install
`yarn install`
### Build

`npx blueprint build` or `yarn blueprint build`

### Test

`npx blueprint test` or `yarn blueprint test`

### Deploy or run another script

`npx blueprint run` or `yarn blueprint run`

### Add a new contract

`npx blueprint create ContractName` or `yarn blueprint create ContractName`

# License
MIT
# bdaf-ton-tutorial
