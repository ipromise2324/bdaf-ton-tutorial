import { Opcodes } from './../helpers/Opcodes';
import { KeyPair, mnemonicToPrivateKey } from 'ton-crypto';
import { Blockchain, SandboxContract, TreasuryContract } from '@ton-community/sandbox';
import { Cell, toNano, Sender } from 'ton-core';
import { Main } from '../wrappers/Main';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';
import { mnemonicNew, sign } from 'ton-crypto';
import { randomAddress } from '@ton-community/test-utils';

async function randomKp() {
    let mnemonics = await mnemonicNew();
    return mnemonicToPrivateKey(mnemonics);
}

describe('Main', () => {
    let code: Cell;
    let blockchain: Blockchain;
    let main: SandboxContract<Main>;
    let kp: KeyPair;
    let owner: SandboxContract<TreasuryContract>;

    beforeAll(async () => {
        code = await compile('Main');
    });

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        kp = await randomKp();
        owner = await blockchain.treasury('owner');

        main = blockchain.openContract(Main.createFromConfig({
            seqno: 0,
            publicKey: kp.publicKey,
            ownerAddress: owner.address,
        }, code));

        const deployer = await blockchain.treasury('deployer');

        const deployResult = await main.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: main.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and main are ready to use
    });

    it('should accept deposit', async () => {
        const sender = await blockchain.treasury('sender');
        const balanceBefore = await main.getBalance();
        const senderBalanceBefore = await sender.getBalance();
        // console.log('Contract balance (Before):',balanceBefore);
        // console.log('Sender Balance (Before):',senderBalanceBefore);
        const depositResult = await main.sendDeposit(sender.getSender(), toNano('2'));

        expect(depositResult.transactions).toHaveTransaction({
            from: sender.address,
            to: main.address,
            success: true,
        });

        const balanceAfter = await main.getBalance();
        const senderBalanceAfter = await sender.getBalance();
        // console.log('Contract balance (After):',senderBalanceAfter);
        // console.log('Sender Balance (After):',balanceAfter);
        const senderdiff = Number(senderBalanceBefore) - Number(senderBalanceAfter)
        const contractdiff = Number(balanceAfter) - Number(balanceBefore);
        console.log('Sender diff:',senderdiff);
        console.log('Contract diff:',contractdiff);
        expect(senderdiff).toBeGreaterThan(toNano('2'));
        expect(contractdiff).toBeGreaterThan(toNano('1.99'));
        
        //expect(balance).toBeGreaterThan(toNano('1.99'));
    });

    it('should allow owner to withdraw funds', async () => {
        const depositAmount = toNano('2');
        const withdrawAmount = toNano('1');
    
        // Send a deposit to the contract
        const sender = await blockchain.treasury('sender');
        await main.sendDeposit(sender.getSender(), depositAmount);
        const balanceBefore = await main.getBalance();
        //console.log('Contract balance (Before):',balanceBefore);
        // Now try to withdraw
        const withdrawResult = await main.sendWithdraw(owner.getSender(), {
            value: toNano('0.05'),
            amount: withdrawAmount
        });
        // Check that the transaction was successful
        expect(withdrawResult.transactions).toHaveTransaction({
            from: owner.address,
            to: main.address,
            success: true,
        });
    
        // Check that the balance of the contract has decreased by the correct amount
        const balanceAfter = await main.getBalance();
        //console.log('Contract balance (After):',balanceAfter);
        const diff = Number(balanceBefore) - Number(balanceAfter);
        console.log('Diff:',diff);
        expect(diff).toBeGreaterThanOrEqual(toNano('0.955'));
    });
    
    
    it('should not allow to withdraw funds if sender is not an owner', async () => {
        const sender = await blockchain.treasury('sender');
        await main.sendDeposit(sender.getSender(), toNano('2'));
        const withdrawResult =  await main.sendWithdraw(sender.getSender(), {
            value: toNano('0.05'),
            amount: toNano('1')
        });
        expect(withdrawResult.transactions).toHaveTransaction({
            from: sender.address,
            to: main.address,
            success: false,
            exitCode: 411,
        });
    });

    it('should change owner', async () => {
        //const ownerAddressBefore = owner.address;
        const newOwnerAddress = randomAddress();

        const changeOwnerResult = await main.sendChangeOwner(owner.getSender(), 
        {
            value: toNano('0.5'),
            newOwner: newOwnerAddress
        });

        expect(changeOwnerResult.transactions).toHaveTransaction({
            from: owner.address,
            to: main.address,
            success: true,
        });
        const currentOwnerAddress = await main.getOwner();
        expect(currentOwnerAddress.toString()).toBe(newOwnerAddress.toString());
    });

    it('should not allow non-owner to change owner', async () => {
        const nonOwner = await blockchain.treasury('nonOwner');
        const newOwnerAddress = randomAddress();
        const currentOwnerAddress = await main.getOwner();
    
        const changeOwnerResult = await main.sendChangeOwner(nonOwner.getSender(), 
        {
            value: toNano('0.5'),
            newOwner: newOwnerAddress
        });
    
        expect(changeOwnerResult.transactions).toHaveTransaction({
            from: nonOwner.address,
            to: main.address,
            success: false,
            exitCode: 411, // assuming 411 is the error code for unauthorized operation
        });
    
        const afterOwnerAddress = await main.getOwner();
        expect(afterOwnerAddress.toString()).toBe(currentOwnerAddress.toString()); // owner should not have changed
    });
    
    it('should send message to owner', async () => {
        // Create a sender who is not the owner
        const nonOwner = await blockchain.treasury('nonOwner');
    
        // Define the message content
        const password = 123456;
    
        // Send the message to the contract
        const sendMessageResult = await main.sendMessageToOwner(nonOwner.getSender(), {
            value: toNano('0.5'),
            password
        });
    
        // Check that the transaction was successful
        expect(sendMessageResult.transactions).toHaveTransaction({
            from: nonOwner.address,
            to: main.address,
            success: true,
        });
    });
    
    it('should not allow owner to send message to himself', async () => {
        // Define the message content
        const password = 123456;
    
        // Send the message to the contract
        const sendMessageResult = await main.sendMessageToOwner(owner.getSender(), {
            value: toNano('0.5'),
            password
        });
    
        // Check that the transaction was not successful
        expect(sendMessageResult.transactions).toHaveTransaction({
            from: owner.address,
            to: main.address,
            success: false, // Assuming that the transaction should fail
        });
    });
    
    it('should sign and selfdestruct contract', async () => {
        const selfDestructResult = await main.sendExtMessage({
            opCode: Opcodes.selfdestruct,
            signFunC: (buf) => sign(buf, kp.secretKey),
            seqno: 0
        });
        
        expect(selfDestructResult.transactions).toHaveTransaction({
            from: main.address,
            to: owner.address,
            success: true,
        });
    });

    it('should fail on wrong signature', async () => {
        const badKp = await randomKp();
        await expect(
            main.sendExtMessage({
                opCode: Opcodes.selfdestruct,
                signFunC: (buf) => sign(buf, badKp.secretKey),
                seqno: 0
            })
        ).rejects.toThrow('Error executing transaction');

    });
});
