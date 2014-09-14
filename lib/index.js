/**
*
*	STREAM: kurtosis
*
*
*	DESCRIPTION:
*		- Reduce stream factory to calculate the sample excess kurtosis of streamed data values.
*
*
*	NOTES:
*		[1] 
*
*
*	TODO:
*		[1] 
*
*
*	LICENSE:
*		MIT
*
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	// MODULES //

	var // Stream-combiner:
		pipeline = require( 'stream-combiner' ),

		// Map transform stream:
		mapper = require( 'flow-map' ),

		// Stream reduce:
		reducer = require( 'flow-reduce' );


	// FUNCTIONS //

	/**
	* FUNCTION: reduce()
	*	Returns a data reduction function.
	*
	* @private
	* @returns {Function} data reduction function
	*/
	function reduce() {
		var delta = 0,
			delta_n = 0,
			delta_n2 = 0,
			term1 = 0;
		/**
		* FUNCTION: reduce( acc, data )
		*	Defines the data reduction.
		*
		* @private
		* @param {Object} acc - accumulation object containing the following properties: N, mean, M2, M3, M4. 'N' is the observation number. 'mean' is the mean accumulator. 'M2' is the sum of squared difference accumulator. 'M3' is the cubed difference accumulator. 'M4' is the quartic difference accumulator.
		* @param {Number} data - numeric stream data
		* @returns {Object} accumulation object
		*/
		return function reduce( acc, x ) {
			acc.N += 1;

			delta = x - acc.mean;
			delta_n = delta / acc.N;
			delta_n2 = delta_n * delta_n;

			term1 = delta * delta_n * (acc.N-1);

			acc.M4 += term1*delta_n2*(acc.N*acc.N - 3*acc.N + 3 ) + 6*delta_n2*acc.M2 - 4*delta_n*acc.M3;
			acc.M3 += term1*delta_n*(acc.N-2) - 3*delta_n*acc.M2;
			acc.M2 += term1;
			acc.M1 += delta;
			acc.mean += delta_n;

			return acc;
		};
	} // end FUNCTION reduce()

	/**
	* FUNCTION: transform( data )
	*	Defines the data transformation.
	*
	* @private
	* @param {Object} data - stream data
	* @returns {Number} transformed data
	*/
	function transform( data ) {
		var N = data.N,
			M2 = data.M2,
			M4 = data.M4,
			g;

		// Population excess kurtosis:
		g = N*M4 / ( M2*M2 ) - 3;
		
		// Return the corrected sample excess kurtosis:
		return (N-1) / ( (N-2)*(N-3) ) * ( (N+1)*g + 6 );
	} // end FUNCTION transform()


	// STREAM //

	/**
	* FUNCTION: Stream()
	*	Stream constructor.
	*
	* @returns {Stream} Stream instance
	*/
	function Stream() {
		this._M2 = 0; // sum[(x-mu)^2]
		this._M3 = 0; // sum[(x-mu)^3]
		this._M4 = 0; // sum[(x-mu)^4]
		this._mean = 0; // mu
		this._N = 0;

		return this;
	} // end FUNCTION stream()

	/**
	* METHOD: stream()
	*	Returns a JSON data reduction stream for calculating the statistic.
	*
	* @returns {Object} stream pipeline
	*/
	Stream.prototype.stream = function() {
		var rStream, mStream, pStream;

		// Get the reduction stream:
		rStream = reducer()
			.reduce( reduce() )
			.acc({
				'N': this._N,
				'mean': this._mean,
				'M2': this._M2,
				'M3': this._M3,
				'M4': this._M4
			})
			.stream();

		// Get the map stream:
		mStream = mapper()
			.map( transform )
			.stream();

		// Create the pipeline:
		pStream = pipeline(
			rStream,
			mStream
		);

		return pStream;
	}; // end METHOD stream()


	// EXPORTS //

	module.exports = function createStream() {
		return new Stream();
	};

})();