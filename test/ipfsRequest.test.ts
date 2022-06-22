
import { ipfsRequest, ipfsUriFromParams, localIpfsGatewayUrlFromUri } from '../src/requests/ipfs';
import httpMocks from 'node-mocks-http';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);
const expect = chai.expect;


describe('requests/ipfs', function () {
    describe('localIpfsGatewayUrlFromUri()', () => {
        it('should not throw if ipfs uri is correctly formatted', () => {
            expect(() => localIpfsGatewayUrlFromUri('ipfs://testestestestest')).to.not.throw();
            expect(() => localIpfsGatewayUrlFromUri('ipfs://testestestestest/display.png')).to.not.throw();
        });

        it('should throw if ipfs uri isn\'t correctly formatted', () => {
            expect(() => localIpfsGatewayUrlFromUri('ipf://testestestestest/display.png')).to.throw(/Invalid ipfs uri:/);
            expect(() => localIpfsGatewayUrlFromUri('ipfs:/testestestestest/display.png')).to.throw(/Invalid ipfs uri:/);
        });
    });

    describe('ipfsUriFromParams()', () => {
        it('should not throw if ipfs params are valid', () => {
            expect(() => ipfsUriFromParams({"ipfsCID": "QmfXz1ibFh1B24RqFyv49AyMNeNqhuhP815aXzEYswcsSU"})).to.not.throw();
            expect(() => ipfsUriFromParams({"ipfsCID": "bafybeictsoehxf4zgdqrwppawr26l7l2bjpftftkdffgnnsfuroptfaoum", "fileName": "display.png"})).to.not.throw();
        });

        it('should throw if ipfs params aren\'t valid', () => {
            expect(() => ipfsUriFromParams({"ipfsCID": "QmfXz1ibFh1B24RqFy2222v49AyMNeNqhuhP815aXzEYswcsSU"})).to.throw(/Failed to parse CID:/);
            expect(() => ipfsUriFromParams({"ipfsCID": "bafybeictsoehxf4zgdqrwppawr26lftftkdffgnnsfuroptfaoum", "fileName": "display.png"})).to.throw(/Failed to parse CID:/);
        });
    });

    describe('ipfsRequest handler', () => {
        describe('no postgres available', () => {
            var request  = httpMocks.createRequest({
                method: 'GET',
                url: '/user/42',
                params: {
                id: 42
                }
            });
        
            var response = httpMocks.createResponse();

            it('should fulfull', () => {
                return expect(ipfsRequest(request, response)).to.eventually.be.fulfilled;
            });

            it('should return 500', () => {
                expect(response.statusCode).to.equal(500);
            });
        })
    });
});