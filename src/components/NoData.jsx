import React, { Component } from 'react';

import no_data from 'assets/images/no_data.svg';
class NoData extends Component { 
    constructor(props) {
        super();
    }

    render () {
        
        return (

            <div className={"flex " + (this.props.size)} style={{...this.props.style}}>
                <div className="w-full flex flex-col items-center justify-center p-9">

                    {this.props.icon
                        ?
                            <div className='w-[100px]'>
                                {this.props.icon}
                            </div>
                        :
                            this.props.hide_image
                                ?
                                    null
                                :
                                    <img className="max-w-[150px]" src={this.props.src ? this.props.src : no_data} />
                        
                    }
                    
                    {this.props.message !== '' &&
                    
                        <div className='text-xs text-gray-600 mt-5'>{this.props.message}</div>
                    }
                    
                    {this.props.children}
                </div>
            </div>
        )
    }
}

export default NoData;